"""
A file for shared utilities
"""
import json
import subprocess
import tempfile
import time
from pathlib import Path

import geopandas as gpd
import pandas as pd
import requests
import us
from census import Census


def pull_population(api_key: str, year: int = 2020) -> pd.DataFrame:
    """
    Pull county population data from the Census API. Also, make some clean ups
    for our data set. In particular:
        * Make Alaska one county
        * Change Shannon County, SD, to Ogala Lakota County, SD.

    Args:
        api_key: Your census API key
        year: The decennial Census year you're using. Must be in [1990, 2022)

    Returns:
        A DataFrame with columns "id" (which is the 5-digit county FIPS as a str) and
            "population" which is the integer population.
    """
    decennial_year = ((year - 2) // 10) * 10
    if decennial_year not in [1990, 2000, 2010]:
        raise ValueError(f"Year must be in [1992, 2022), not {year}")

    census = Census(api_key)

    if year == 2010:
        data = census.sf1.state_county("P001001", "*", "*", year=decennial_year)
        df = pd.DataFrame(data).rename(columns={"P001001": "population"})
    else:
        # Something is busted with the Census package for 2000 SF1s
        # Note that the 1990 SF1 is down :-/
        df = pd.read_json(
            f"https://api.census.gov/data/{decennial_year}/dec/sf1?get=P001001&for=county:*&in=state:*&key={api_key}",
            orient="values",
        )
        df = df.iloc[1:]
        df.columns = ["population", "state", "county"]

    df["population"] = df["population"].astype(int)

    # Fix Alaska
    just_alaska = df[df["state"] == "02"]
    just_alaska = pd.DataFrame(
        {
            "state": ["02"],
            "county": ["000"],
            "population": [just_alaska["population"].sum()],
        }
    )
    df = pd.concat([df[df["state"] != "02"], just_alaska])

    df["id"] = df["state"] + df["county"]
    df = df.drop(columns=["state", "county"])

    # Finally, Shannon County South Dakota got renamed in 2015. Fix this.
    if year >= 2015:
        df["id"] = df["id"].apply(lambda x: "46102" if x == "46113" else x)

    return df


def _pull_2000_counties(year: int):
    base_url = "https://www2.census.gov/geo/tiger/PREVGENZ/co/co00shp/"
    state_gdfs = []
    for state in us.STATES + [us.states.DC]:
        state_gdfs.append(gpd.read_file(base_url + f"co{state.fips}_d00_shp.zip"))

    gdf = pd.concat(state_gdfs)
    gdf["id"] = gdf["STATE"] + gdf["COUNTY"]
    gdf["name"] = gdf["NAME"]

    if year >= 2000:
        # In 2001, Clinton Forge Virginia reverted to town status. Notably, it does
        # not appear in the MIT election data from 2000 even though it should have
        # existed at the time?
        gdf = gdf[gdf["id"] != "51560"].copy()

    # Some counties seem to be problematic in our simplification when they have
    # tiny subsidiary parts. Just keep the largest area one for each FIPS
    #
    # N.B. Yes, this "area" computation is meaningless because we're in lat/lon
    #      but this process seems to work OK in practice
    # import ipdb; ipdb.set_trace()
    bad_fips = [("08005", True), ("51685", False)]
    bad_gdfs = []
    for bad_fip, keep_largest in bad_fips:
        bad_gdf = gdf[gdf["id"] == bad_fip].copy()
        bad_gdf["tmp_area"] = bad_gdf.area
        bad_gdf = (
            bad_gdf.sort_values(by=["id", "AREA"])
            .drop_duplicates("id", keep="last" if keep_largest else "first")
            .drop(columns=["tmp_area"])
        )
        bad_gdfs.append(bad_gdf)

    gdf = pd.concat(
        [gdf[~gdf["id"].isin([x[0] for x in bad_fips])], pd.concat(bad_gdfs)]
    )

    # It seems that MultiPolygons weren't part of the spec in pre-2010 data
    gdf = gdf[["id", "name", "geometry"]].dissolve("id").reset_index()

    return gdf


def get_county_boundaries(year: int) -> gpd.GeoDataFrame:
    # For now, we take the year to be 2011 or later because TIGER totally
    # rearranged its files in 2011, making this function a lot harder to accomplish.

    if year >= 2013:
        url = f"https://www2.census.gov/geo/tiger/GENZ{year}/shp/cb_{year}_us_county_5m.zip"
        geoid_name = "GEOID"
    elif year >= 2010:
        # There was no file in 2011. The file structure in 2012 is odd. Just take 2010
        url = "https://www2.census.gov/geo/tiger/GENZ2010/gz_2010_us_050_00_500k.zip"
        geoid_name = "GEO_ID"
    elif year >= 2000:
        return _pull_2000_counties(year)
    else:
        raise NotImplementedError("Can't currently handle pre-2010 dates")

    gdf = gpd.read_file(url)
    gdf = gdf[[geoid_name, "NAME", "geometry"]].rename(
        columns={geoid_name: "id", "NAME": "name"}
    )
    gdf["id"] = gdf["id"].str[-5:]
    gdf["name"] = gdf["name"].apply(
        lambda x: x.decode("latin1") if type(x) == bytes else x
    )
    return gdf


def flatten_counties(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Make some adjustments to the topojson file we pull to align to
    election data we pull from the NYT.
    """
    fips_to_state = {
        state.fips: state.abbr for state in us.STATES + [us.states.lookup("DC")]
    }
    gdf["state"] = gdf["id"].apply(lambda x: x[:2]).map(fips_to_state)

    # Merge all of Alaska
    just_alaska = gdf[gdf["state"] == "AK"].copy()
    just_alaska["merger"] = 0
    just_alaska = (
        just_alaska.dissolve(by="merger").reset_index().drop(columns=["merger"])
    )
    just_alaska["id"] = "02000"
    just_alaska["name"] = "Alaska"

    final_gdf = pd.concat([gdf[gdf["state"] != "AK"], just_alaska])

    # Drop Kalawao County, HI, as it causes issues
    final_gdf = final_gdf[final_gdf["id"] != "15005"].copy()

    # Drop counties with high FIPS codes
    max_fips = max(int(state.fips) for state in us.STATES)  # Should be Wyoming
    final_gdf = final_gdf[
        final_gdf["id"].apply(lambda x: int(x[:2]) <= max_fips)
    ].copy()

    return final_gdf


def gdf_to_topojson(gdf: gpd.GeoDataFrame, filename: str):
    """
    Write gdf to a topojson at filename.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        gdf.to_file(tmpdir / "tmp.json", driver="GeoJSON")

        subprocess.run(
            [
                "npx",
                "geo2topo",
                "-q",
                "1e5",
                f"counties={tmpdir / 'tmp.json'}",
                "-o",
                str(tmpdir / "tmp.albers.topo.json"),
            ],
            check=True,
        )

        subprocess.run(
            [
                "npx",
                "toposimplify",
                "-f",
                "-s",
                "1e-7",
                "-o",
                filename,
                f"{tmpdir / 'tmp.albers.topo.json'}",
            ],
            check=True,
        )

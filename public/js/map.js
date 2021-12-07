/* Translation maps */

/* Return a query parameter from a URL */
var getParameterByName = function (name, url) {
  if (!url) {
    url = window.location.href;
  }
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/* Splits based on 2012 vs 2016 vs 2020 data */

var year = null,
    loser = null,
    dataFile = null,
    data = {},
    partyToCandidate = null;

var setYear = function(newYear) {
  // Currently the 1990 SF1 API is down :-/
  // if (newYear === '2000') {
  //   year = newYear;
  //   dataFile = 'data/us2000.json';
  //   partyToCandidate = {
  //     'dem': 'Al Gore',
  //     'gop': 'George W. Bush',
  //     'grn': "Green Party",
  //     'lib': 'Libertarian Party',
  //     'una': 'Unaffiliated',
  //     'oth': 'Other'
  //   }
  //   loser = 'Al Gore';
  // } else
  if (newYear === '2004') {
    year = newYear;
    dataFile = 'data/us2004.json';
    partyToCandidate = {
      'dem': 'John Kerry',
      'gop': 'George W. Bush',
      'grn': "Green Party",
      'lib': 'Libertarian Party',
      'una': 'Unaffiliated',
      'oth': 'Other'
    }
    loser = 'John Kerry';
  } else if (newYear === '2008') {
    year = newYear;
    dataFile = 'data/us2008.json';
    partyToCandidate = {
      'dem': 'Barack Obama',
      'gop': 'John McCain',
      'grn': "Green Party",
      'lib': 'Libertarian Party',
      'una': 'Unaffiliated',
      'oth': 'Other'
    }
    loser = 'John McCain';
  } else if (newYear === '2012') {
    year = newYear;
    dataFile = 'data/us2012.json';
    partyToCandidate = {
      'dem': 'Barack Obama',
      'gop': 'Mitt Romney',
      'grn': "Green Party",
      'lib': 'Gary Johnson',
      'una': 'Unaffiliated',
      'oth': 'Other'
    }
    loser = 'Mitt Romney';

  } else if (newYear == '2020') {
    year = newYear;
    dataFile = 'data/us2020.json';
    partyToCandidate = {
      'dem': 'Joe Biden',
      'gop': 'Donald Trump',
      'grn': 'Green',
      'lib': 'Jo Jorgensen',
      'una': 'Unaffiliated',
      'oth': 'Other'
    };
    loser = 'Donald Trump';
  } else {
    year = newYear;
    dataFile = 'data/us.json';
    partyToCandidate = {
      'dem': 'Hillary Clinton',
      'gop': 'Bernie Sanders',
      'grn': "Jill Stein",
      'lib': 'Gary Johnson',
      'una': 'Evan McMullin',
      'oth': 'Other'
    }
    loser = 'Hillary Clinton';
  }
}

{
  let paramYear = getParameterByName('year') || '2020';
  setYear(paramYear);
  document.querySelector("#selectYear option[value='" + year + "']").setAttribute("selected", "selected");
}

var numberToLetter = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

var letterToNumber = {};
for (var i=0; i<numberToLetter.length; ++i) {
  letterToNumber[numberToLetter[i]] = i;
}
var countyToState = {}

var STATE_ABBREVS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI',
  'WY'
];

const stateToNumber = {};
for (let i = 0; i < STATE_ABBREVS.length; ++i) {
  stateToNumber[STATE_ABBREVS[i]] = i;
}

const tableHeaders = ['population', 'electors', 'dem', 'gop', 'lib', 'grn', 'una', 'oth', 'Dem %', 'GOP %'];

/* Global state variables */
var MOVE_KEY = 77;
var HOLD_KEY = 81;  // Q
var ERASE_KEY = 87;  // W
var DISPLAY_MODE_KEY = 80;  // P

var currentMode = 'pickup';
var displayMode = 'raw';
var isHoldDown = false;
var isEraseDown = false;
var countyMode = 'show';
var showStateColors = true;
var stateTotals = {}

/* Data: Read once and store */
var us = null;


var switchModeButton = d3.select('#switchModeButton').html('<u>M</u>ove');
var switchModeFunction = function() {
  if (currentMode === 'pickup') {
    switchModeButton.html('Cancel <u>m</u>ove').classed('btn-danger', false).classed('btn-warning', true);
    currentMode = 'dropoff';
  } else {
    switchModeButton.html('<u>M</u>ove').classed('btn-danger', true).classed('btn-warning', false);
    currentMode = 'pickup';
  }
}
switchModeButton.on('click', switchModeFunction);

// keyboard shortcut to activate moving counties
d3.select("body")
  .on("keydown", function(ev) {
    if (ev.keyCode == MOVE_KEY) {
      switchModeFunction()
    } else if (ev.keyCode == HOLD_KEY) {
      isEraseDown = false;
      isHoldDown = true;
    } else if (ev.keyCode == ERASE_KEY) {
      isEraseDown = true;
      isHoldDown = false;
    } else if (ev.keyCode == DISPLAY_MODE_KEY) {
      displayMode = displayMode === 'raw' ? 'percent' : 'raw';
      update();
    }
  })
  .on("keyup", function(ev) {
    if (ev.keyCode == HOLD_KEY) {
      isHoldDown = false;
    } else if (ev.keyCode == ERASE_KEY) {
      isEraseDown = false;
    }
  });

var countyModeButton = d3.select("#countyModeButton").html("Hide Counties");
var countyModeFunction = function () {
  if (countyMode === 'show') {
    countyMode = 'hide';
    countyModeButton.html("Outlines Only");
    g.selectAll("path").remove();
    update();
  } else if (countyMode === 'hide' && showStateColors) {
    showStateColors = false;
    countyModeButton.html("Show Counties");
    g.selectAll("path").remove();
    update();
  } else {
    countyMode = 'show';
    showStateColors = true;
    countyModeButton.html("Hide Counties");
    g.selectAll("path").remove();
    update();
  }
}
countyModeButton.on('click', countyModeFunction);

const margin = {top: 5, right: 5, bottom: 5, left: 5},
  fullWidth = 960, fullHeight = 500,
  width = fullWidth - margin.left - margin.right,
  height = fullHeight - margin.top - margin.bottom;

var projection = d3.geoAlbersUsa().scale(width).translate([width / 2, height / 2]);
var path = d3.geoPath().projection(projection);
var smallScale = true;

/* County detail tooltip */
var tooltip = d3.select('body').append('div')
            .attr('class', 'hidden tooltip');

var tooltipInner = tooltip.append('div').attr('class', 'tooltip-inner');
var tooltipTitle = tooltipInner.append('div').attr('class', 'tooltip-title');
var tooltipTable = tooltipInner.append('div').attr('class', 'tooltip-content').append('table').attr('class', 'table county-results');
var tooltipTr = tooltipTable.append('thead').append('tr')
tooltipTr.append('th').html('Candidate');
tooltipTr.append('th').html('Votes');
tooltipTr.append('th').html('Pct.');
var tooltipTbody = tooltipTable.append('tbody');

// /* State detail tooltip */
// var tooltipState = d3.select('body').append('div')
//             .attr('class', 'hidden tooltip');
// 
// var tooltipInnerState = tooltipState.append('div').attr('class', 'tooltip-inner');
// var tooltipTitleState = tooltipInnerState.append('div').attr('class', 'tooltip-title');
// var tooltipTableState = tooltipInnerState.append('div').attr('class', 'tooltip-content').append('table').attr('class', 'table state-results');
// var tooltipTrState = tooltipTableState.append('thead').append('tr')
// tooltipTrState.append('th').html('Candidate');
// tooltipTrState.append('th').html('Votes');
// tooltipTrState.append('th').html('Pct.');
// var tooltipTbodyState = tooltipTableState.append('tbody');

/* Setup instructions tooltip */
d3.select("#instructionsHelper")
  .on("mousemove", function(ev) {
    d3.select("#instructionsTooltip").classed('hidden', false)
      .attr('style', 'left:' + (ev.pageX + 15) + 'px; top:' + (ev.pageY - 15) + 'px');
  })
  .on("mouseout", function(ev) {
    d3.select("#instructionsTooltip").classed('hidden', true);
  });

var svg = d3.select("#states-svg")
  .attr('width', width)
  .attr('height', height)
  .attr("viewBox", [0, 0, fullWidth, fullHeight]);

var g = svg.append('g');

/* On update, compute the number of electors a state would get.
 * Uses 2010 Census data and the algorithm described here:
 * https://en.wikipedia.org/wiki/United_States_congressional_apportionment#The_method_of_equal_proportions
 *
 * @updates stateTotals
 */
var computeElectors = function() {
  var priorities = [];
  var allocated = 0;
  var maxElectors = 435; // Start with assumption that all states have zero population
  for (var state of STATE_ABBREVS) {
    if (stateTotals[state].population > 0) {
      // All states, DC included, get a minimum of 3 electors
      stateTotals[state].electors = 3;
      // Increase the maximum number of electors by the number of senators for each state.
      // For DC, must also add the phantom "representative".
      // 435 representatives plus 2 senators for 50 states plus 3 electors for DC equals 538.
      (state !== 'DC') ? maxElectors += 2 : maxElectors +=3;
    } else {
      stateTotals[state].electors = 0;
    }
    allocated += stateTotals[state].electors;
    if (state !== 'DC') {
      // DC doesn't get any more electors than the least populous state,
      // which for the lifespan of this tool we can safely assume to be 3.
      priorities.push({key: state, val: stateTotals[state].population / Math.sqrt(2)});
    }
  }

  priorities.sort(function(a, b) {
    if (a.val === b.val) {
      return 0;
    }
    return a.val < b.val ? 1 : -1;
  });

  while (allocated < maxElectors) {
    var nextUp = priorities[0];
    var nextState = stateTotals[nextUp.key];
    nextState.electors += 1;
    allocated += 1;
    nextUp.val = nextState.population / Math.sqrt((nextState.electors - 2) * (nextState.electors - 1));
    priorities.sort(function(a, b) {
      if (a.val === b.val) {
        return 0;
      }
      return a.val < b.val ? 1 : -1;
    });
  }
}

/* Utilities */

/* If obj has prop as a property, return the value. Else return 0. */
var hasOrZero = function(obj, prop) {
  if (obj.hasOwnProperty(prop)) {
    return obj[prop];
  } else {
    return 0;
  }
}

/* Return the integer d with commas at thousands places */
var intWithCommas = function(d) {
  return d.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

var getColorClass = function(d) {
  if (d.properties.hasOwnProperty('state')) {
    var s = stateTotals[d.properties.state];
    if (s.dem > s.gop) {
      var demPercent = Math.floor(d.properties.dem / (d.properties.gop + d.properties.dem) * 20) * 5;
      if (demPercent < 50) {
        demPercent = 'less-than-50';
      }
      return 'dem-' + demPercent;
    } else {
      var demPercent = Math.floor(d.properties.dem / (d.properties.gop + d.properties.dem) * 20) * 5;
      if (demPercent >= 50) {
        demPercent = 'greater-than-50';
      }
      return 'dem-' + demPercent;
    }
  } else {
    return "black";
  }
}

/**** D3 ****/

/* The main D3 update loop */
var update = function() {
  /* Update elector numbers */
  computeElectors();

  /* Details table rendering */
  d3.select('#states')
    .selectAll("tr")
    .data(STATE_ABBREVS)
    .join("tr")
    .selectAll("td")
    .data(function (d, i) {
      let state = stateTotals[STATE_ABBREVS[i]];
      if (displayMode === 'raw') {
        return [STATE_ABBREVS[i], state.population, state.electors,
                state.dem, state.gop, state.grn, state.lib, state.una, state.oth];
      } else {
        let totalVotes = state.dem + state.gop + state.grn + state.lib + state.una + state.oth;
        return [STATE_ABBREVS[i], state.population, state.electors,
                (state.dem / totalVotes * 100).toFixed(2) + '%',
                (state.gop / totalVotes * 100).toFixed(2) + '%',
                (state.grn / totalVotes * 100).toFixed(2) + '%',
                (state.lib / totalVotes * 100).toFixed(2) + '%',
                (state.una / totalVotes * 100).toFixed(2) + '%',
                (state.oth / totalVotes * 100).toFixed(2) + '%'
              ];
      }

    })
    .join("td")
    .text(intWithCommas)
    .attr("class", function(d, i) {
      if (i === 0) {
        return stateTotals[d].dem > stateTotals[d].gop ? "blue-state" : "red-state";
      } else {
        return null;
      }
    });

  /* Draw United States with colors! */
  if (countyMode === 'show') {
    // get current zoom level
    let zoomLevel = 1;
    if (g.attr("transform")) {
      zoomLevel = parseInt(g.attr("transform").match(/scale\((\d+)/)[1]);
    }

    g.classed('wide-zoom-stroke', zoomLevel < 5).classed('close-zoom-level', zoomLevel >= 5);

    // We do a full, county level rendering
    g.selectAll("path.county-path")
      .data(topojson.feature(us, us.objects.counties).features)
      .join("path")
      .attr("d", path)
      .attr("class", d => "county-path " + getColorClass(d))
      .on("click", function(ev, d) {
        if (ev.defaultPrevented) return;  // We're zooming
        if (currentMode === 'pickup') {
          // Select or deselect the county
          var me = d3.select(this);
          if (me.classed('selection-color')) {
            me.classed(getColorClass(d), true);
            me.classed("selection-color", false);
          } else {
            me.classed(getColorClass(d), false);
            me.classed("selection-color", true);
          }
        } else if (currentMode === 'dropoff') {
          // Move the counties into their new state
          var newState = d.properties.state;
          var newStateData = stateTotals[newState];
          d3.selectAll("path.selection-color")
            .each(function(dd) {
              var oldState = dd.properties.state;
              dd.properties.state = newState;
              var oldStateData = stateTotals[oldState];
              for (let i = 0; i < tableHeaders.length; ++i) {
                let key = tableHeaders[i];
                newStateData[key] += hasOrZero(dd.properties, key);
                oldStateData[key] -= hasOrZero(dd.properties, key);
              }
            }
          );
          update();
          switchModeFunction();
        }
      })
      .on('mousemove', function(ev, d) {
        // Show county level detail
        tooltip.classed('hidden', false)
          .attr('style', 'left:' + (ev.pageX + 15) + 'px; top:' + (ev.pageY - 15) + 'px');
      })
      .on('mouseover', function(ev, d) {
        if (isHoldDown && currentMode === 'pickup') {
          // If the hold key is down and we're in pickup mode, select the county
          var me = d3.select(this);
          me.classed(getColorClass(d), false);
          me.classed("selection-color", true);
        } else if (isEraseDown && currentMode === 'pickup') {
          // If the erase key is down and we're in pickup mode, deselect the county
          var me = d3.select(this);
          me.classed(getColorClass(d), true);
          me.classed("selection-color", false);
        }

        // NICK very important for tomorrow
        // Initialize the county level detail
        tooltipTitle.selectAll(".tooltip-title-heading")
          .data([d.properties.name])
          .join("div")
          .attr("class", "tooltip-title-heading")
          .html(d => d);

        tooltipTitle.selectAll(".tooltip-title-state-heading")
          .data([d.properties.state])
          .join("div")
          .attr("class", "tooltip-title-state-heading")
          .html(d => d);

        let thisData = [];
        let total = 0;
        for (var party in partyToCandidate) {
          var partyTotal = hasOrZero(d.properties, party);
          if (partyTotal > 0) {
            thisData.push([partyToCandidate[party], partyTotal]);
            total += partyTotal;
          }
        }

        tooltipTbody.selectAll("tr")
          .data(thisData)
          .join("tr")
          .selectAll("td")
          .data(d => [d[0], d[1], (100 * d[1] / total).toFixed(2) + '%'])
          .join("td")
          .html((d, i) => i === 0 ? d : intWithCommas(d));
      })
      .on('mouseout', function() {
        // Hide the county level detail
        tooltip.classed('hidden', true);
      });
  }

  // Draw state boundaries
  g.selectAll("path.state-boundary")
    .data(
      d3.group(
        us.objects.counties.geometries,
        d => d.hasOwnProperty("properties") ? (d.properties.state || "other") : "other"
      )
    )
    .join("path")
    .attr("class", "state-boundary state-boundary-filled")
    .attr("d", d => path(topojson.merge(us, d[1])))
    .attr("class", d => {
      if (countyMode === "hide" && showStateColors) {
        // If we're hiding the counties, we want to color whole states
        if (stateTotals.hasOwnProperty(d[0])) {
          let state = stateTotals[d[0]];
          var dem = hasOrZero(state, 'dem');
          var gop = hasOrZero(state, 'gop');
          var demPercent = Math.floor(dem / (dem + gop) * 20) * 5;
          return "state-boundary dem-" + demPercent + '-state';
        } else {
          return "state-boundary";
        }
      } else {
        // Else, we'll just keep the boundary
        return "state-boundary state-boundary-filled";
      }
    //  .on('mousemove', function(ev, d) {
    //    // Show county level detail
    //    tooltip.classed('hidden', false)
    //      .attr('style', 'left:' + (ev.pageX + 15) + 'px; top:' + (ev.pageY - 15) + 'px');
    })
    //  .on('mouseover', function(ev, d) {
//
    //    // Initialize the state level detail Nick
    //    tooltipTitleState.selectAll(".tooltip-title-heading-state")
    //      .data([d.properties.name])
    //      .join("div")
    //      .attr("class", "tooltip-title-heading-state")
    //      .html(d => d);
//
    //    tooltipTitleState.selectAll(".tooltip-title-state-heading-state")
    //      .data([d.properties.state])
    //      .join("div")
    //      .attr("class", "tooltip-title-state-heading-state")
    //      .html(d => d);
//
    //    let thisData = [];
    //    let total = 0;
    //    for (var party in partyToCandidate) {
    //      var partyTotal = hasOrZero(d.properties, party);
    //      if (partyTotal > 0) {
    //        thisData.push([partyToCandidate[party], partyTotal]);
    //        total += partyTotal;
    //      }
    //    }
//
    //    tooltipTbody.selectAll("tr")
    //      .data(thisData)
    //      .join("tr")
    //      .selectAll("td")
    //      .data(d => [d[0], d[1], (100 * d[1] / total).toFixed(2) + '%'])
    //      .join("td")
    //      .html((d, i) => i === 0 ? d : intWithCommas(d));
    //  })

  // Setup zoom. Order seems to be important, so it should go here.
  svg.call(d3.zoom().extent([[0, 0], [960, 500]]).scaleExtent([1, 12]).on("zoom", zoomed));

  // Recompute the total number of electoral votes and senators
  var demTotal = 0;
  var gopTotal = 0;
  var totalElectors = 0;
  var totalSenators = 0;
  for (var i=0; i<STATE_ABBREVS.length; ++i) {
    var state = STATE_ABBREVS[i];
    var s = stateTotals[state];
    totalElectors += s.electors;
    totalSenators +=2;
    if (s.dem > s.gop) {
      demTotal += s.electors;
    } else {
      gopTotal += s.electors;
    }
  }

  // Get the average Dem two-party vote share Nick
  var totalDem = 0;
  var totalGop = 0;
  for (var i=0; i<STATE_ABBREVS.length; ++i) {
    var state = STATE_ABBREVS[i];
    var s = stateTotals[state];
    totalDem += s.dem;
    totalGop += s.gop;
  }

  var demVoteShare = totalDem / (totalDem + totalGop);

  // Recompute the total number of Senate votes Nick
  var solidDemTotal = 0;
  var likelyDemTotal = 0;
  var leanDemTotal = 0;
  var tossupTotal = 0;
  var leanGopTotal = 0;
  var likelyGopTotal = 0;
  var solidGopTotal = 0;
  var totalElectors = 0;
  for (var i=0; i<STATE_ABBREVS.length; ++i) {
    var state = STATE_ABBREVS[i];
    var s = stateTotals[state];
    totalElectors += s.electors;
    if (state !== 'DC' && s.dem != 0) {
      if (s.dem/(s.dem + s.gop) - demVoteShare > .15) {
        solidDemTotal += 2;
      } else if (s.dem/(s.dem + s.gop) - demVoteShare > .10) {
        likelyDemTotal += 2;
      } else if (s.dem/(s.dem + s.gop) - demVoteShare > .05) {
        leanDemTotal += 2;
      } else if (s.dem/(s.dem + s.gop) - demVoteShare > -.05) {
        tossupTotal += 2;
      } else if (s.dem/(s.dem + s.gop) - demVoteShare > -.10) {
        leanGopTotal += 2;
      } else if (s.dem/(s.dem + s.gop) - demVoteShare > -.15) {
        likelyGopTotal += 2;
      } else {
        solidGopTotal += 2;
      }
    }
  }

  // Color and fill in EV bar
  d3.select('.ev-bar')
    .attr('style', 'background: linear-gradient(to right, #179ee0 ' + (demTotal / totalElectors * 100) + '%, #ff5d40 ' + (demTotal / totalElectors * 100) + '%, #ff5d40 100%)');
  d3.select(".ev-bar-dem-total").text(demTotal);
  d3.select(".ev-bar-gop-total").text(gopTotal);

  d3.select('.sen-bar')
    .attr('style', 'background: linear-gradient(to right, #002D62 ' + 
          (solidDemTotal / totalSenators * 100) + '%, #0000FF ' + 
          (solidDemTotal / totalSenators * 100) + '%, #0000FF ' +
          ((solidDemTotal + likelyDemTotal) / totalSenators * 100) + '%, #4F86F7 ' + 
          ((solidDemTotal + likelyDemTotal) / totalSenators * 100) + '%, #4F86F7 ' + 
          ((solidDemTotal + likelyDemTotal + leanDemTotal) / totalSenators * 100) + '%, #808080 ' +
          ((solidDemTotal + likelyDemTotal + leanDemTotal) / totalSenators * 100) + '%, #808080 ' +
          ((solidDemTotal + likelyDemTotal + leanDemTotal + tossupTotal) / totalSenators * 100) + '%, #EA4C46 ' +
          ((solidDemTotal + likelyDemTotal + leanDemTotal + tossupTotal) / totalSenators * 100) + '%, #EA4C46 ' +
          ((solidDemTotal + likelyDemTotal + leanDemTotal + tossupTotal + leanGopTotal) / totalSenators * 100) + '%, #B22222 ' +
          ((solidDemTotal + likelyDemTotal + leanDemTotal + tossupTotal + leanGopTotal) / totalSenators * 100) + '%, #B22222 ' +
          ((solidDemTotal + likelyDemTotal + leanDemTotal + tossupTotal + leanGopTotal + likelyGopTotal) / totalSenators * 100) + '%, #960018 ' +
          ((solidDemTotal + likelyDemTotal + leanDemTotal + tossupTotal + leanGopTotal + likelyGopTotal) / totalSenators * 100) + '%, #960018 100%)');
  

  var solidDemMsg = ""; 
  if (solidDemTotal > 6) {
    solidDemMsg = "Solid D: " + solidDemTotal;
  } else if (solidDemTotal > 0) {
    solidDemMsg = solidDemTotal;
  }

  var likelyDemMsg = ""; 
  if (likelyDemTotal > 6) {
    likelyDemMsg = "Likely D: " + likelyDemTotal;
  } else if (likelyDemTotal > 0) {
    likelyDemMsg = likelyDemTotal;
  }

  var leanDemMsg = ""; 
  if (leanDemTotal > 6) {
    leanDemMsg = "Lean D: " + leanDemTotal;
  } else if (leanDemTotal > 0) {
    leanDemMsg = leanDemTotal;
  }

  var tossupMsg = ""; 
  if (tossupTotal > 6) {
    tossupMsg = "Tossup: " + tossupTotal;
  } else if (tossupTotal > 0) {
    tossupMsg = tossupTotal;
  }

  var leanGopMsg = ""; 
  if (leanGopTotal > 6) {
    leanGopMsg = "Lean R: " + leanGopTotal;
  } else if (leanGopTotal > 0) {
    leanGopMsg = leanGopTotal;
  }

  var likelyGopMsg = ""; 
  if (likelyGopTotal > 6) {
    likelyGopMsg = "Likely R: " + likelyGopTotal;
  } else if (likelyGopTotal > 0) {
    likelyGopMsg = likelyGopTotal;
  }

  var solidGopMsg = ""; 
  if (solidGopTotal > 6) {
    solidGopMsg = "Solid R: " + solidGopTotal;
  } else if (solidGopTotal > 0) {
    solidGopMsg = solidGopTotal;
  }
    
  d3.select(".sen-bar-solid-dem-total").text(solidDemMsg);
  d3.select(".sen-bar-likely-dem-total").text(likelyDemMsg);
  d3.select(".sen-bar-lean-dem-total").text(leanDemMsg);
  d3.select(".sen-bar-tossup-total").text(tossupMsg);
  d3.select(".sen-bar-lean-gop-total").text(leanGopMsg);
  d3.select(".sen-bar-likely-gop-total").text(likelyGopMsg);
  d3.select(".sen-bar-solid-gop-total").text(solidGopMsg);

  d3.select(".sen-bar-solid-dem-total").style.width=(solidDemTotal * 100 / totalSenators)+'%';
  console.log((solidDemTotal * 100 / totalSenators)+'%');
  d3.select(".sen-bar-likely-dem-total").style.width=(likelyDemTotal * 100 / totalSenators)+'%';
  d3.select(".sen-bar-lean-dem-total").style.width=(leanDemTotal * 100 / totalSenators)+'%';
  d3.select(".sen-bar-tossup-total").style.width=(tossupTotal * 100 / totalSenators)+'%';
  d3.select(".sen-bar-lean-gop-total").style.width=(leanGopTotal * 100 / totalSenators)+'%';
  d3.select(".sen-bar-likely-gop-total").style.width=(likelyGopTotal * 100 / totalSenators)+'%';
  d3.select(".sen-bar-solid-gop-total").style.width=(solidGopTotal * 100 / totalSenators)+'%';
}

/* Read data once! */
var reset = function(dataFile, useUrl) {
  if (dataFile in data) {
    execReset(data[dataFile], useUrl);
  } else {
    d3.json(dataFile).then(function(usData) {
      data[dataFile] = usData;
      execReset(usData, useUrl);
    });
  }
}

var execReset = function(usData, useUrl) {
  us = usData;
  stateTotals = {};

  for (var i=0; i<STATE_ABBREVS.length; ++i) {
    stateTotals[STATE_ABBREVS[i]] = {population: 0,
                                     electors: 0,
                                     color: 1,
                                     dem: 0, gop: 0, grn: 0, lib: 0, una: 0, oth: 0};
  }

  g.selectAll('path').remove();
  d3.selectAll('#states>tr').remove();

  if (useUrl) {
    var shareParameter = getParameterByName('share');
    if (shareParameter) {
      us.objects.counties.geometries.sort((x, y) => parseInt(x.properties.id) - parseInt(y.properties.id))

      var newShareParameter = [];
      var curNumber = '';
      for (var i = 0; i < shareParameter.length; ++i) {
        var letter = shareParameter[i];
        if (/\d/.test(letter)) {
          curNumber += letter;
        } else {
          curNumber = parseInt(curNumber || '1');
          for (var j = 0; j < curNumber; ++j) {
            newShareParameter.push(letter);
          }
          curNumber = '';
        }
      }

      for (var i=0; i<newShareParameter.length; ++i) {
        var num = letterToNumber[newShareParameter[i]];
        var geom = us.objects.counties.geometries[i];
        if (!geom) {
          console.log("problem ", i);
        }
        if (num !== 51 && geom && geom.hasOwnProperty('properties')) {
          geom.properties.state = STATE_ABBREVS[num];
        }
      }
    }
  }

  for (var i=0; i<us.objects.counties.geometries.length; ++i) {
    var county = us.objects.counties.geometries[i];
    if (!county.hasOwnProperty('properties') || !county.properties.hasOwnProperty("state")) {
      // There are a few numbers in the 72000s which appear to be part of nothing in particular.
      continue;
    }
    countyToState[county.id] = county.properties.state;
    var state = stateTotals[county.properties.state];
    state.population += hasOrZero(county.properties, 'population');
    state.dem += hasOrZero(county.properties, 'dem');
    state.gop += hasOrZero(county.properties, 'gop');
    state.grn += hasOrZero(county.properties, 'grn');
    state.lib += hasOrZero(county.properties, 'lib');
    state.una += hasOrZero(county.properties, 'una');
    state.oth += hasOrZero(county.properties, 'oth');
    state.dempct = state.dem / (state.dem + state.gop + state.grn + state.lib + state.una + state.lib)
    state.goppct = state.gop / (state.dem + state.gop + state.grn + state.lib + state.una + state.lib)
  }

  update();
}

reset(dataFile, true);
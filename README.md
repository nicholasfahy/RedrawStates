# Democracy Lines

Video: https://www.youtube.com/watch?v=jtYu-Gz35aE

This CS 50 final project is a more tricked-out version of kevinhayeswilson.com/redraw, that allows you to view the impact of state boundaries on likely U.S. Senate outcomes, in addition to the Electoral College, among several other improvements.

Instructions on how to view my website are copied, with some changes, from Kevin Hayes Wilson below, starting on line 15.

Every time I added or changed something in the original code, I somewhat pedantically included a comment with "CS 50" in it describing what I did. You can assume that anything I did not claim as my own work was carried over from the original website.

I made changes to index.html, map.css, and map.js, all within the public -> js folder. Ctrl-f or cmd-f search these three files for "CS 50" to see my changes. Most of my substantive work happened in map.js. Additionally, I created share.js, which contains code that used to be part of map.js, but which I made into its own file (with its own corresponding script in index.html) because it seemed like better design to avoid cluttering map.js.

In general, toggling back and forth between my website and kevinhayeswilson.com/redraw will make many of my changes apparent.

I've copied the instructions on viewing the website below from Kevin Hayes Wilson's corresponding README file. Note that you have to create your own fork of my project and be in that folder when you attempt to execute the command-line argument he talks about. Here are his instructions:

## Usage

If you want to try to make sense of the current draft product, then just run

```bash
cd public && python3 -m http.server
```

into your command line in VSC, and then point your browser to `localhost:8000/map.html`.

## Grabbing data

To grab data and structure it for production, you will need to have both Python 3.8 or above installed as well as node 12 or above. After that, you'll need to install dependencies with:

```bash
poetry install
npm install
```

After that, you can create the 2016 and 2020 data sets by running:

```bash
poetry run redraw 2016 public/data/us.json
poetry run redraw 2020 public/data/us2020.json
```

If you'd like to recreate the 2012, 2008, and 2004 files, you need to grab the
data set at::

    https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/VOQCHQ

Supposed you saved it as `countypres_2000-2016.csv`. Then you would run the commands:

```
poetry run redraw mit 2012 countypres_2000-2016.csv public/data/us2012.json
poetry run redraw mit 2008 countypres_2000-2016.csv public/data/us2008.json
poetry run redraw mit 2004 countypres_2000-2016.csv public/data/us2004.json
```
/**** Sharing ****/

/* Turn map into URL */
var getShareUrl = function() {
    us.objects.counties.geometries.sort((x, y) => parseInt(x.properties.id) - parseInt(y.properties.id));
  
    shareUrl = [];
    var curLetter = null;
    var curStreak = 0;
  
    for (var i=0; i<us.objects.counties.geometries.length; ++i) {
      var geom = us.objects.counties.geometries[i];
      var letter = geom.hasOwnProperty('properties') ?
        numberToLetter[stateToNumber[geom.properties.state]] :
        numberToLetter[51];
  
      if (letter === curLetter) {
        curStreak++;
      } else {
        if (curStreak === 1) {
          shareUrl.push(curLetter);
        } else if (curStreak > 1) {
          shareUrl.push(curStreak + curLetter);
        }
        curLetter = letter;
        curStreak = 1;
      }
    }
    shareUrl.push(curStreak + curLetter);
  
    var baseUrl = window.location.origin + window.location.pathname + '?';
    if (year !== '2020') {
      baseUrl += 'year=' + year + '&';
    }
    return baseUrl + 'share=' + shareUrl.join('');
  }
  
  /* Setup sharing URL in the share box */
  var doShare = function() {
    $("#clipboard-target").val(getShareUrl());
  }
  
  $("#shareGroup").hide();
  
  $("#shareButton").popover({
    container: 'body',
    content: $("#shareGroup"),
    title: "Copy URL to Share",
    html: true,
    placement: "left",
    trigger: "focus"
  }).on("click", doShare).on('show.bs.popover', () => $("#shareGroup").show());
  
  var clipboard = new Clipboard('[data-clipboard-tooltip]');
  clipboard.on('success', function(e) {
    e.clearSelection();
    console.info('Action:', e.action);
    console.info('Text:', e.text);
    console.info('Trigger:', e.trigger);
  });
  
  d3.select("#selectYear").on("change", function(ev) {
    var newYear = ev.target.selectedOptions[0].value;
    setYear(newYear);
    reset(dataFile, false);
  })
  
  var zoomed = function({transform}) {
    g.attr("transform", transform)
    if (transform.k >= 5) {
      g.classed('wide-zoom-stroke', false).classed('close-zoom-stroke', true);
    } else {
      g.classed('wide-zoom-stroke', true).classed('close-zoom-stroke', false);
    }
  }
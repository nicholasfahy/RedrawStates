In this project, I wanted to build upon the basic argument that Kevin Hayes Wilson makes by his provocative tool: that basic aspects of the U.S. political system are archaic and arbitrary in ways that warp our political outcomes.

The original website shows the arbitrariness of the Electoral College. I thought I could use the same principles to show how the Senate has an even worse pro-Republican bias than the Electoral College, while making a few design improvements to the original website along the way. Ultimately, my project succeeded in showing how unrepresentative the Senate really is.

The basic visual effect for the user comes from a second bar at the top of the screen, below the Electoral College bar. It graphically displays the number of Senate seats that would be competitive for each side in a hypothetical election where the U.S. popular vote for president was tied.

That's the key phrase: if it was tied. It is technically possible to have a state that is blue in the Electoral College (because the Democratic presidential nominee won it) but Lean R (because, for instance, she only won it by 1 point in a hypothetical year where she beat her opponent in the national popular vote by 10 points). In practice, this has not happened in the lifespan of this tool; the closest anyone has gotten to that was Pres. Obama in 2008 in Montana.

With that in mind, the technical components: To make the graphic Senate bar, I copied the CSS and HTML for the Electoral College bar, then substituted in my own logic in Javascript (map.js) to tell the program how to fill the bar with different colors and text fields, and to update the colors and text dynamically as the user moved counties between states.

The biggest unexpected challenge of this project was figuring out how to make it so that the text for each category (Solid D, etcetera), aligned with the corresponding color behind it. Ultimately, the solution came from a combination of removing the words "Solid D:" and just displaying the number if the box was too small to fit the word, removing the number entirely if the value was 0, setting the CSS display property to "flex," and giving each bit of text the position "relative" and text-align "center" to put them in the middle of each box.

In map.js, I came up with a formula to assign values to solidDemTotal, likelyDemTotal, and so forth depending on the state's partisan lean, automatically updating every time the user moved one or more counties to a different state.

I also made several style improvements to the original website. I made Dem and GOP vote percentages visible in the table at the bottom, along with the state's partisan lean. In map.css, I increased the color contrast of the shades of red and blue of the different states when you click the "Hide Counties" button, so you have a better idea of exactly how red or blue a state is. I consolidated third-party vote shares in the table. I added headings for the HTTML rows.

I also made several other minor changes, such as getting rid of the bad "2016 income" data set, that don't have a huge impact on the user experience but trimmed fluff out of the code.
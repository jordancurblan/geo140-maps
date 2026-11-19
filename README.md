# Map Atlas — GEO 140 Map Quizzes

Interactive practice for every map quiz in GEO 140, World Regional Geography (Lake Land College).

| # | Region | Places |
|---|--------|-------:|
| 01 | South Asia | 23 |
| 02 | Southeast Asia | 26 |
| 03 | East Asia | 18 |
| 04 | Oceania | 29 |
| 05 | Sub-Saharan Africa | 46 |
| 06 | Latin America | 42 |
| 07 | United States & Canada | 37 |

## Modes

- **Study** shows every place with a label. Select a marker for a short note.
- **Find it** gives you a name. You tap its marker on the blank map.
- **Name it** highlights a marker. You choose its name from four options.

Each group is split into sets of five. A set counts as cleared only when every answer is right. The full mix comes after that. Progress is saved in the visitor's browser.

## Structure

```
index.html          Home page with the region cards
quiz.html           Quiz page (?map=<id>)
assets/style.css    Shared styles, light and dark
assets/quiz.js      Quiz engine
assets/home.js      Home page cards
assets/theme.js     Dark mode toggle
assets/data.js      Every place, with its pixel position on its map
maps/*.png          Blank base maps
```

To add a map, put the image in `maps/` and add an entry to `assets/data.js`. It needs `id`, `title`, `img`, `w`, `h`, `groups` and `places` (`[name, group, x, y, note, labelSide]`). Use `callouts` to draw a leader line from an offshore marker to the place's true position.

## Publishing on GitHub Pages

1. Create a public repository.
2. Upload every file in this folder to the root of the repository. Keep the folder structure.
3. Open **Settings → Pages**. Set Source to **Deploy from a branch**, the branch to `main` and the folder to `/ (root)`, then save.
4. The site goes live at `https://<username>.github.io/<repository>/` within a minute or two.

No build step or dependencies are needed. It is a plain static site.

#!/bin/sh
# Rebuilds index.html from src/ (uses local three.min.js)
cd "$(dirname "$0")"
{ cat src/a_head.html; echo '<script src="three.min.js"></script>'; echo '<script>'; cat src/b_scene.js src/c_fighter.js src/c2_class.js src/d1_combat.js src/d2_match.js src/e_ui.js; echo '</script>'; } > index.html
echo "Built index.html"

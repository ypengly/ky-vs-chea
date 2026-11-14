# KY vs CHEA - Boxing Championship

A 3D boxing game for desktop and mobile browsers. Three.js r128, plain JavaScript, no build step needed.

## Run
Open index.html in a modern browser (Chrome, Edge, Firefox, Safari). three.min.js sits next to it, so it works offline.
Google Fonts load from the web when online; the game falls back to system fonts otherwise.
Optional local server: `python3 -m http.server 8000` then open http://localhost:8000

## Controls
Player 1: WASD move, J jab, K cross, U left hook, I right hook, O uppercut, L body punch, Space block (hold), Q/E dodge left/right, Shift special, P or Esc pause.
Player 2 (versus mode): Arrow keys move, Numpad 4/5/7/8/9/6 punches (or 1-6), Numpad0 or / block, Numpad1/3 dodge (or , and .), NumpadEnter or Right Shift special.
Touch: left joystick, right-hand punch buttons, BLOCK, DODGE L/R, SPECIAL.
When knocked down, mash any punch button to get up faster.

## Source layout (src/)
a_head.html page shell, styles, menus, HUD | b_scene.js renderer, arena, crowd, LED screens, effects, audio
c_fighter.js roster, procedural fighter rig, punch poses | c2_class.js Fighter state machine and animation
d1_combat.js hit resolution, AI, training drills | d2_match.js match flow, scoring, camera, HUD, main loop
e_ui.js menus, settings, results, keyboard and touch input

Edit the files in src/ and run ./build.sh to regenerate index.html.
Tuning knobs: Fighter constructor in c2_class.js (damage, speed, stamina), ATK table in c_fighter.js, aiStep in d1_combat.js.

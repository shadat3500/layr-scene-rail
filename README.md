# LAYR Scene Rail

A storefront page with a hanging clothes rail: pieces drift along a curved rail, turn to the front on hover (tap on phones), open into a product view, and add to a slide-in cart. Click **Scene Rail** in the menu to switch between the studio (white) and outdoor (mountain) backgrounds.

## Run it

It's plain HTML, CSS and JavaScript, with no build step:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

- `index.html`: the page
- `css/style.css`: layout, fonts, animations
- `js/app.js`: rail motion, hover turn, product view, cart, search, scenes
- `assets/img/`: garment cut-outs (`parka-<color>-<side|front|back>.webp`)
- `assets/fonts/`: Inter (OFL licence included)

## Customise

- **Logo:** replace the `<a class="logo">` block in `index.html`.
- **Products:** edit `PRODUCTS` and `RAIL` at the top of `js/app.js`, and add images named `<id>-side.webp`, `<id>-front.webp` and `<id>-back.webp`.
- **Checkout:** it isn't connected to a payment provider yet.

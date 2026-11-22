## MMM-NEO
Near Earth Objects.

Have you ever wondered how many Near Earth Objects are passing our planet every day?
How big are they? How fast are they travelling? Are they potentially dangerous? Be afraid. Be VERY afraid!

Shows today's asteroids passing Earth from NASA's NeoWs data, closest pass first: all at once as a list, or one at a time.

![](pix/1.JPG), ![](pix/2.JPG),

![](pix/3.JPG)

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/cowboysdude/MMM-NEO
```

No `npm install` needed.

Works without an API key (it uses NASA's `DEMO_KEY`, which is limited). If you see "too many requests" in the log, get a free key at https://api.nasa.gov and put it in `apiKey`.

## Config.js entry and options

```js
{
    module: "MMM-NEO",
    position: "top_left",              // best in left, right or center regions
    config: {
        rotateInterval: 30 * 1000,     // next object every 30 seconds
        maxWidth: "275px"
    }
},
```

| Option | Default | What it does |
|---|---|---|
| `rotateInterval` | `30000` | How often to show the next object, in milliseconds (30 seconds). |
| `maxWidth` | `"275px"` | Width of the module. |
| `useHeader` / `header` | `false` / `""` | Show a header above the module. |
| `animationSpeed` | `3000` | Fade between objects, in milliseconds. |
| `units` | your config's `units` | `"imperial"` = miles, feet and mph. `"metric"` = km, meters and km/h. |
| `css` | `"light"` | `"light"` = white card, `"dark"` = dark card (both match MMM-NOAAV4). `""` = the original plain text look. |
| `width` | `330` | Card width in pixels. |
| `showAll` | `true` | `true` = list all of today's objects at once (closest first). `false` = one at a time, switching every `rotateInterval`. |
| `maxObjects` | `6` | Most objects to list when `showAll` is on. |
| `showCount` | `true` | "1 of 12 passing Earth today" line in one-at-a-time mode. |
| `apiKey` | `""` | Your free NASA key from https://api.nasa.gov. Empty = `DEMO_KEY`. |
| `updateInterval` | `3600000` | How often to ask NASA, in milliseconds (once an hour). Keep it: `DEMO_KEY` is limited. |

## What changed (2026 update)

- **Fixed:** wouldn't start on current MagicMirror (it needed the old `request` package, which MagicMirror no longer includes; now uses built-in `fetch`).
- **Fixed:** stopped showing objects after midnight (it never noticed the date changed).
- **Fixed:** crashed on a day with no objects.
- **New card look** (light or dark) with a meteor badge, today's count, and each asteroid's miss distance (also as "× the Moon"), size, speed and closest-approach time.
- Closest pass shown first; miles/mph with imperial units; numbers with commas; closest-approach time; "Potentially hazardous: Yes" highlighted; optional `apiKey`.

Voice control: send `HIDE_NEO` or `SHOW_NEO`.

## Special thanks to NASA's NEO team and SpaceCowboysDude

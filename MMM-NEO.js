/* MagicMirror²
 * Module: MMM-NEO
 *
 * Near Earth Objects passing Earth today, from NASA's NeoWs.
 * By Mykle1, updated for current MagicMirror.
 */
Module.register("MMM-NEO", {
	defaults: {
		rotateInterval: 30 * 1000,       // show the next object every 30 seconds
		useHeader: false,                // true if you want a header
		header: "",
		maxWidth: "275px",
		animationSpeed: 3000,            // fade between objects
		updateInterval: 60 * 60 * 1000,  // ask NASA once an hour (keep it: DEMO_KEY is limited)
		apiKey: "",                      // optional: your free key from https://api.nasa.gov (DEMO_KEY is used if empty)
		units: config.units,             // "imperial" = miles and mph, "metric" = km and km/h
		showCount: true,                 // "1 of 12 passing Earth today" (one-at-a-time mode)
		showAll: true,                   // true = list all of today's objects at once | false = one at a time
		maxObjects: 6,                   // most objects to list when showAll is true
		css: "light",                    // "light" = white card | "dark" = dark card | "" = plain text (old look)
		width: 330                       // card width in pixels (matches MMM-NOAAV4)
	},

	requiresVersion: "2.1.0",

	getStyles () {
		return ["MMM-NEO.css"];
	},

	start () {
		Log.info(`Starting module: ${this.name}`);
		this.objects = [];
		this.loaded = false;
		this.error = null;
		this.activeItem = 0;
		this.date = null;

		this.getNEO();
		setInterval(() => this.getNEO(), Math.max(15 * 60 * 1000, this.config.updateInterval));
		// check every minute whether the day changed, so a new day gets new objects
		setInterval(() => {
			if (moment().format("YYYY-MM-DD") !== this.date) this.getNEO();
		}, 60 * 1000);
		setInterval(() => {
			if (this.objects.length > 1) {
				this.activeItem = (this.activeItem + 1) % this.objects.length;
				this.updateDom(this.config.animationSpeed);
			}
		}, this.config.rotateInterval);
	},

	getNEO () {
		this.date = moment().format("YYYY-MM-DD");
		this.sendSocketNotification("GET_NEO", {
			identifier: this.identifier,
			apiKey: this.config.apiKey,
			date: this.date
		});
	},

	socketNotificationReceived (notification, payload) {
		if (!payload || payload.identifier !== this.identifier) return;
		if (notification === "NEO_RESULT") {
			// closest pass first
			this.objects = payload.objects.slice().sort((a, b) =>
				Number(a.close_approach_data[0].miss_distance.kilometers) - Number(b.close_approach_data[0].miss_distance.kilometers));
			// keep showing the same object after an hourly refresh; start over only on a new day
			if (payload.date !== this.shownDate || this.activeItem >= this.objects.length) this.activeItem = 0;
			this.shownDate = payload.date;
			this.loaded = true;
			this.error = null;
			this.updateDom(this.config.animationSpeed);
		} else if (notification === "NEO_ERROR") {
			this.error = payload.message;
			if (!this.loaded) this.updateDom(0);
		}
	},

	num (n) {
		return Math.round(Number(n)).toLocaleString();
	},

	line (cls, label, value) {
		const d = document.createElement("div");
		d.className = cls;
		d.innerHTML = label ? `${label}&nbsp; ${value}` : value;
		return d;
	},

	// ---- card look (css: "light" or "dark") ----
	short (n, unit) {
		n = Number(n);
		if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M ${unit}`;
		if (n >= 1e4) return `${Math.round(n / 1e3)}K ${unit}`;
		return `${Math.round(n).toLocaleString()} ${unit}`;
	},

	stat (label, value, sub) {
		return `<div class="neo-stat"><div class="neo-slabel">${label}</div><div class="neo-svalue">${value}</div>${sub ? `<div class="neo-ssub">${sub}</div>` : ""}</div>`;
	},

	rock (neo) {
		const pass = neo.close_approach_data[0];
		const imperial = this.config.units === "imperial";
		const moons = Number(pass.miss_distance.kilometers) / 384400;
		const when = pass.epoch_date_close_approach
			? moment(pass.epoch_date_close_approach).format(config.timeFormat === 24 ? "HH:mm" : "h:mm A")
			: "";
		const hazard = neo.is_potentially_hazardous_asteroid ? "<span class='neo-chip'>Hazardous</span>" : "";
		const name = String(neo.name).replace(/[()]/g, "");
		return `<div class="neo-rock">
			<div class="neo-rhead"><span class="neo-name">${name}</span>${hazard}<span class="neo-when">${when}</span></div>
			<div class="neo-stats">
				${this.stat("Misses by", imperial ? this.short(pass.miss_distance.miles, "mi") : this.short(pass.miss_distance.kilometers, "km"),
					`${moons < 10 ? moons.toFixed(1) : Math.round(moons)}&times; the Moon`)}
				${this.stat("Size", imperial ? `${this.num(neo.estimated_diameter.feet.estimated_diameter_max)} ft` : `${this.num(neo.estimated_diameter.meters.estimated_diameter_max)} m`)}
				${this.stat("Speed", imperial ? `${this.num(pass.relative_velocity.miles_per_hour)} mph` : `${this.num(pass.relative_velocity.kilometers_per_hour)} km/h`)}
			</div>
		</div>`;
	},

	getDom () {
		const style = String(this.config.css || "").toLowerCase();
		if (style !== "light" && style !== "dark") return this.getDomPlain();

		const card = document.createElement("div");
		card.className = style === "dark" ? "neo-card neo-dark" : "neo-card";
		const width = parseInt(this.config.width, 10);
		if (width > 0) card.style.width = `${width}px`;

		const count = this.loaded ? this.objects.length : 0;
		const sub = !this.loaded
			? (this.error ? "NASA data not available right now" : "Loading…")
			: count === 0 ? "None passing today"
			: this.config.showAll ? `Today · ${count} passing Earth`
			: `Today · ${this.activeItem + 1} of ${count}`;
		let html = `<div class="neo-head">
			<div class="neo-badge"><i class="fa-solid fa-meteor"></i></div>
			<div><div class="neo-title">${this.config.header || "Near-Earth Asteroids"}</div><div class="neo-sub">${sub}</div></div>
		</div>`;

		if (this.loaded && count) {
			const list = this.config.showAll
				? this.objects.slice(0, Math.max(1, this.config.maxObjects))
				: [this.objects[this.activeItem] || this.objects[0]];
			html += list.map((n) => this.rock(n)).join("");
			if (this.config.showAll && count > list.length) html += `<div class="neo-more">+ ${count - list.length} more today</div>`;
		}
		card.innerHTML = html;
		return card;
	},

	getDomPlain () {
		const wrapper = document.createElement("div");
		wrapper.className = "wrapper";
		wrapper.style.maxWidth = this.config.maxWidth;

		if (this.config.useHeader) {
			const header = document.createElement("header");
			header.classList.add("xsmall", "bright", "light");
			header.innerHTML = this.config.header;
			wrapper.appendChild(header);
		}

		if (!this.loaded) {
			wrapper.appendChild(this.line("bright light small", "", this.error ? "NASA data not available right now." : "This is gonna be close..."));
			return wrapper;
		}

		if (!this.objects.length) {
			wrapper.appendChild(this.line("small bright", "", "No Near Earth Objects today."));
			return wrapper;
		}

		if (this.config.showAll) {
			const imperial = this.config.units === "imperial";
			const list = this.objects.slice(0, Math.max(1, this.config.maxObjects));
			wrapper.appendChild(this.line("xsmall dimmed", "", `${this.objects.length} passing Earth today`));
			list.forEach((neo) => {
				const pass = neo.close_approach_data[0];
				const row = document.createElement("div");
				row.className = "neo-row";
				row.appendChild(this.line("small bright", "", neo.name + (neo.is_potentially_hazardous_asteroid ? " <span class='neo-hazard'>hazardous</span>" : "")));
				const miss = imperial ? `${this.num(pass.miss_distance.miles)} mi` : `${this.num(pass.miss_distance.kilometers)} km`;
				const size = imperial ? `${this.num(neo.estimated_diameter.feet.estimated_diameter_max)} ft` : `${this.num(neo.estimated_diameter.meters.estimated_diameter_max)} m`;
				const speed = imperial ? `${this.num(pass.relative_velocity.miles_per_hour)} mph` : `${this.num(pass.relative_velocity.kilometers_per_hour)} km/h`;
				row.appendChild(this.line("xsmall", "", `Misses by ${miss} · ${size} · ${speed}`));
				wrapper.appendChild(row);
			});
			if (this.objects.length > list.length) {
				wrapper.appendChild(this.line("xsmall dimmed", "", `+ ${this.objects.length - list.length} more`));
			}
			return wrapper;
		}

		const neo = this.objects[this.activeItem] || this.objects[0];
		const pass = neo.close_approach_data[0];
		const imperial = this.config.units === "imperial";

		wrapper.appendChild(this.line("small bright", "NASA NEO ID:", neo.name));
		if (this.config.showCount) {
			wrapper.appendChild(this.line("xsmall dimmed", "", `${this.activeItem + 1} of ${this.objects.length} passing Earth today`));
		}
		wrapper.appendChild(this.line("xsmall bright", "Misses Earth by",
			imperial ? `${this.num(pass.miss_distance.miles)} miles` : `${this.num(pass.miss_distance.kilometers)} km`));
		wrapper.appendChild(this.line("xsmall bright", "Closest approach:",
			pass.epoch_date_close_approach ? moment(pass.epoch_date_close_approach).format(config.timeFormat === 24 ? "MMM D, HH:mm" : "MMM D, h:mm A") : pass.close_approach_date));
		wrapper.appendChild(this.line("xsmall bright", "Estimated diameter:",
			imperial ? `${this.num(neo.estimated_diameter.feet.estimated_diameter_max)} feet` : `${this.num(neo.estimated_diameter.meters.estimated_diameter_max)} meters`));
		wrapper.appendChild(this.line("xsmall bright", "Speed:",
			imperial ? `${this.num(pass.relative_velocity.miles_per_hour)} mph` : `${this.num(pass.relative_velocity.kilometers_per_hour)} km/h`));
		wrapper.appendChild(this.line("xsmall bright", "Speed per second:",
			imperial ? `${(Number(pass.relative_velocity.kilometers_per_second) * 0.621371).toFixed(1)} miles/s` : `${Number(pass.relative_velocity.kilometers_per_second).toFixed(1)} km/s`));
		const hazard = this.line("xsmall bright", "Potentially hazardous:", neo.is_potentially_hazardous_asteroid ? "Yes" : "No");
		if (neo.is_potentially_hazardous_asteroid) hazard.classList.add("neo-hazard");
		wrapper.appendChild(hazard);

		return wrapper;
	},

	// voice control
	notificationReceived (notification) {
		if (notification === "HIDE_NEO") this.hide(1000);
		else if (notification === "SHOW_NEO") this.show(1000);
	}
});

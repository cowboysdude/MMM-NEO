/* MagicMirror²
 * Module: MMM-NEO
 *
 * Near Earth Objects passing Earth today, from NASA's NeoWs.
 * By Mykle1, updated for current MagicMirror.
 */
Module.register("MMM-NEO", {
	defaults: {
		rotateInterval: 5 * 60 * 1000,   // show the next object every 5 minutes
		useHeader: false,                // true if you want a header
		header: "",
		maxWidth: "275px",
		animationSpeed: 3000,            // fade between objects
		updateInterval: 60 * 60 * 1000,  // ask NASA once an hour (keep it: DEMO_KEY is limited)
		apiKey: "",                      // optional: your free key from https://api.nasa.gov (DEMO_KEY is used if empty)
		units: config.units,             // "imperial" = miles and mph, "metric" = km and km/h
		showCount: true                  // "12 objects pass Earth today"
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
			this.activeItem = 0;
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

	getDom () {
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

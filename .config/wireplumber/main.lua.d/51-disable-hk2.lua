rule = {
	matches = {
		{
			{ "device.name", "equals", "alsa_card.usb-HK2_HK2_20190805V001-00" },
		},
	},
	apply_properties = {
		["device.disabled"] = true,
	},
}

table.insert(alsa_monitor.rules, rule)

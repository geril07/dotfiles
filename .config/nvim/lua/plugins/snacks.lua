return {
	{
		"folke/snacks.nvim",
		lazy = false,
		priority = 1000,
		---@type snacks.Config
		opts = {
			bigfile = {},
			-- normal mode not working, i_esc closes window but stays in insert mode
			input = { enabled = false, icon = "" },
			styles = {
				input = {
					relative = "cursor",
					title_pos = "left",
					width = 40,
					row = -3,
					col = 0,

					wo = {
						winblend = 0,
						sidescrolloff = 7,
					},

					keys = {
						i_esc = { "<esc>", { "cmp_close", "close", "stopinsert" }, mode = "i", expr = true },
					},
				},
			},
		},
	},
}

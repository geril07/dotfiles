return {
	{
		"geril07/lspsaga.nvim",
		event = "VeryLazy",
		config = function()
			local saga = require("lspsaga")

			local quit_keys = { "q", "<ESC>" }

			local open_keys = { "o", "<CR>" }

			saga.setup({
				diagnostic = {
					keys = {
						toggle_or_jump = open_keys,
					},
				},
				definition = {
					keys = { quit = quit_keys },
				},
				code_action = {
					keys = { quit = quit_keys },
				},
				beacon = {
					enable = false,
				},

				lightbulb = { enable = false },

				rename = {
					keys = {
						quit = { "<C-k>", "q" },
					},
				},
				symbol_in_winbar = {
					enable = false,
					hide_keywords = true,
				},
				finder = {
					keys = {
						expand_or_jump = open_keys,
						quit = quit_keys,
						scroll_down = "<C-f>",
						scroll_up = "<C-d>", -- quit can be a table
					},
				},

				outline = {
					-- layout = "float",
					-- win_position = "center",
				},
			})
		end,
	},
}

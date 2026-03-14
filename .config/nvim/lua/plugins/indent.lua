return {
	{
		"saghen/blink.indent",
		event = "VeryLazy",
		opts = function()
			return {
				static = {
					enabled = true,
					-- char = "▎",
					char = "▏",

					whitespace_char = nil, -- inherits from `vim.opt.listchars:get().space` when `nil` (see `:h listchars`)
					priority = 1,
					highlights = { "CustomHLIndent" },
				},

				scope = {
					enabled = false,
				},
			}
		end,
	},

	{
		"shellRaining/hlchunk.nvim",
		event = "VeryLazy",
		enabled = false,
		opts = function()
			return {
				indent = {
					enable = true,
					chars = { "▏" },
					style = { vim.api.nvim_get_hl(0, { name = "CustomHLIndent" }) },

					delay = 50,
					ahead_lines = 4,
				},
			}
		end,
	},

	{
		"lukas-reineke/indent-blankline.nvim",
		main = "ibl",
		event = "VeryLazy",
		enabled = false,
		opts = {
			indent = { char = "▏" },
			scope = {
				enabled = false,
				show_start = false,
				show_end = false,
				priority = 500,
				include = {

					node_type = { lua = { "return_statement", "table_constructor" } },
				},
			},
		},
	},
}

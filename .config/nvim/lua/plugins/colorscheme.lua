return {
	{
		"catppuccin/nvim",
		name = "catppuccin",
		lazy = false,
		priority = 1000,
		version = "1.11.0",
		config = function()
			local utils = require("my.utils")
			local transparent = utils.transparent
			transparent = true

			require("catppuccin").setup({
				flavour = "macchiato",
				-- flavour = "mocha",
				transparent_background = transparent,
				float = {
					transparent = transparent,
				},
				highlight_overrides = {
					all = function(colors)
						return {
							DiagnosticSignWarn = { fg = colors.yellow, bg = colors.none },
							DiagnosticSignHint = { fg = colors.teal, bg = colors.none },
							DiagnosticSignInfo = { fg = colors.peach, bg = colors.none },
							DiagnosticSignError = { fg = colors.red, bg = colors.none },
							DiagnosticVirtualTextWarn = { fg = colors.yellow, bg = colors.none },
							DiagnosticVirtualTextHint = { fg = colors.teal, bg = colors.none },
							DiagnosticVirtualTextInfo = { fg = colors.peach, bg = colors.none },
							DiagnosticVirtualTextError = { fg = colors.red, bg = colors.none },
							-- CursorLineNr = { fg = colors.text, bg = colors.none },
							NvimTreeLineNr = { fg = colors.surface1 },
							NvimTreeCursorLine = { fg = colors.peach, bg = transparent and colors.none or colors.surface0 },
							NvimTreeFolderIcon = { fg = "#8aadf5" },
							NvimTreeExecFile = { link = "NvimTreeNormal" },

							NvimTreeCursorLineNr = { fg = colors.surface1, bg = colors.none },
							TelescopeSelection = {
								fg = transparent and colors.peach or colors.peach,
								bg = transparent and colors.none or colors.surface0,
								style = { "bold" },
							},
							LineNr = { fg = colors.surface1 },
							WinBarFilePath = { fg = colors.overlay0 },
							WinbarFile = { fg = colors.flamingo },
							WinbarSeparator = { fg = colors.text },
							InclineNormal = { bg = colors.none, fg = colors.flamingo },
							InclineNormalNC = { bg = colors.none, fg = colors.overlay0 },
							TransparentCursor = { blend = 100, nocombine = true },
							WinBarNC = { link = "WinBar" },
							-- TabLine = { bg = transparent and colors.none or colors.mantle },
							-- TabLineSel = { bg = transparent and colors.none or colors.surface1 },
							TabLine = { bg = colors.none },
							TabLineFill = { bg = colors.none },
							TabLineSel = { bg = colors.none },

							BlinkCmpMenuBorder = { fg = colors.blue },
							BlinkCmpDocBorder = { fg = colors.blue },

							["@keyword.export"] = { fg = colors.mauve },
							["@tag.attribute"] = { link = "@tag" },
							["@tag.attribute.tsx"] = { link = "@tag" },
							["@tag.builtin"] = { link = "@tag" },
							["@keyword.operator"] = { link = "@keyword" },
							["@function.builtin"] = { link = "@function" },
						}
					end,
				},

				term_colors = false,
				no_italic = true, -- Force no italic
				no_bold = true, -- Force no bold
				styles = {
					comments = {},
					conditionals = {},
					loops = {},
					functions = {},
					keywords = {},
					strings = {},
					variables = {},
					numbers = {},
					booleans = {},
					properties = {},
					types = {},
					operators = {},
				},

				integrations = {
					hop = true,
					cmp = true,
					gitsigns = true,
					nvimtree = true,
					treesitter = true,
					fidget = false,
					telescope = true,
					lsp_saga = false,
				},
			})

			vim.cmd("colorscheme catppuccin")
			-- vim.cmd("syntax off")
		end,
	},
}

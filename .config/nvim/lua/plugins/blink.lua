-- cmp.snippet_active but without is_hidden_snippet()
-- https://github.com/Saghen/blink.cmp/blob/a1b5c1a47b65630010bf030c2b5a6fdb505b0cbb/lua/blink/cmp/config/snippets.lua#L45
local snippet_active = function(filter)
	local ls = require("luasnip")
	if filter and filter.direction then
		return ls.jumpable(filter.direction)
	end
	return ls.in_snippet()
end

return {
	{
		"saghen/blink.cmp",
		dependencies = { "LuaSnip" },
		build = "cargo +nightly build --release",
		dev = false,
		lazy = true,
		enabled = true,
		opts = {
			enabled = function()
				return not vim.tbl_contains({ "DressingInput" }, vim.bo.filetype)
			end,

			keymap = {
				preset = "none",

				["<C-Space>"] = {
					"cancel",
					"show",
					"fallback",
				},

				["<Tab>"] = {
					function(cmp)
						if cmp.is_visible() then
							return cmp.accept()
						end

						if snippet_active({ direction = 1 }) then
							return cmp.snippet_forward()
						end
					end,
					"fallback",
				},
				["<S-TAB>"] = { "snippet_backward", "fallback" },

				["<CR>"] = { "accept", "fallback" },
				["<C-n>"] = {
					function(cmp)
						if cmp.is_visible() then
							return cmp.select_next()
						end

						return cmp.show()
					end,
					"fallback",
				},
				["<C-p>"] = {
					function(cmp)
						if cmp.is_visible() then
							return cmp.select_prev()
						end

						return cmp.show()
					end,
					"fallback",
				},
				["<C-k>"] = { "scroll_documentation_up", "fallback" },
				["<C-j>"] = { "scroll_documentation_down", "fallback" },
			},
			completion = {
				menu = {
					border = "single",
					min_width = 30,
					auto_show = true,

					draw = {
						align_to = "cursor", -- "none"|"cursor"|"label"

						padding = 1,
						columns = {
							{ "kind_icon" },
							{ "label", "label_description", gap = 1 },
						},
						components = {
							kind_icon = {
								text = function(ctx)
									return ctx.kind_icon .. ctx.icon_gap .. " "
								end,
							},
						},
					},
				},

				accept = {
					resolve_timeout_ms = 50, --50,

					-- neovide cursor flicker
					dot_repeat = true,

					auto_brackets = {
						enabled = false,
					},
				},

				list = {
					selection = { preselect = true, auto_insert = false },
					max_items = 25,
				},

				documentation = {
					auto_show = true,
					auto_show_delay_ms = 150,

					window = {
						border = "single",
					},
				},
			},

			fuzzy = {
				max_typos = 1,
				sorts = {
					"exact",
					"score",
					"sort_text",
					-- "label_shorter_first",
					-- shorter first, will have to use lua sort!
					-- function(a, b)
					-- 	return #a.label < #b.label
					-- end,
					"label",
				},
			},

			snippets = {
				preset = "luasnip",
			},

			-- signature = { enabled = true },
			-- Disable command line completion:
			cmdline = { enabled = false },

			sources = {
				default = { "lsp", "path", "snippets", "buffer" },

				providers = {
					lsp = { fallbacks = {}, timeout_ms = 500 },
				},
			},

			appearance = {
				kind_icons = require("my.icons").symbol_kinds,
			},
		},
	},
}

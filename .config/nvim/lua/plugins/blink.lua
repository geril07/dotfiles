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
		event = "InsertEnter",
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
				trigger = {
					show_on_blocked_trigger_characters = { " ", "\n", "\t", "{", "}" },
				},

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
					max_items = 100,
				},

				documentation = {
					auto_show = true,
					auto_show_delay_ms = 150,

					window = {
						border = "single",
					},
				},
			},

			appearance = {
				kind_icons = require("my.icons").symbol_kinds,
			},

			fuzzy = {
				-- max_typos = 1,
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
					lsp = {
						fallbacks = {},
						timeout_ms = 300,
						transform_items = function(ctx, items)
							local function filter_emmet_if_outside_elements()
								local bufnr = ctx.bufnr
								local clients_per_bufnr = vim.lsp.get_clients({ bufnr = bufnr })
								local emmet_name = "emmet_language_server"

								if
									#vim.tbl_filter(function(client)
										if client.name == emmet_name then
											return true
										end
										return false
									end, clients_per_bufnr) == 0
								then
									return items
								end
								local buftype = vim.bo[bufnr].filetype
								local embedded_fts = { "vue", "typescriptreact", "javascriptreact", "svelte" }
								if vim.tbl_contains(embedded_fts, buftype) then
									local ts_utils = require("nvim-treesitter.ts_utils")
									local node = ts_utils.get_node_at_cursor()
									local emmet_ts_nodes = { "jsx_element", "template_element", "style_element" }
									local not_emmet_ts_nodes = { "script_element" }

									while node ~= nil do
										if vim.tbl_contains(emmet_ts_nodes, node:type()) then
											return items
										end
										if vim.tbl_contains(not_emmet_ts_nodes, node:type()) then
											break
										end
										node = node:parent()
									end

									return vim.tbl_filter(function(item)
										return item.client_name ~= emmet_name
									end, items)
								end

								return items
							end

							-- if true then
							-- 	return items
							-- end
							-- local started = vim.uv.hrtime()
							local ok, result = pcall(filter_emmet_if_outside_elements)
							-- print("time: ", (vim.uv.hrtime() - started) / 1e6, "ms")

							if ok then
								return result
							end
							print("failed to filter out emmet", result)

							return items
						end,
					},
				},
			},
		},
	},
}

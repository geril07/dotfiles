-- cmp.snippet_active but without is_hidden_snippet()
-- https://github.com/Saghen/blink.cmp/blob/a1b5c1a47b65630010bf030c2b5a6fdb505b0cbb/lua/blink/cmp/config/snippets.lua#L45
local snippet_active = function(filter)
	local ls = require("luasnip")
	if filter and filter.direction then
		return ls.jumpable(filter.direction)
	end
	return ls.in_snippet()
end

local is_dev = false

return {
	{
		"saghen/blink.cmp",
		dependencies = { "LuaSnip" },
		build = "cargo +nightly build --release",
		dev = is_dev,
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
					show_on_blocked_trigger_characters = { " ", "\n", "\t", "{", "}", "!" },
					show_on_insert_on_trigger_character = false,
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
				prebuilt_binaries = { ignore_version_mismatch = true },
				use_frecency = not is_dev,

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
					path = {
						score_offset = 0,
					},

					lsp = {
						fallbacks = {},
						timeout_ms = 300,
						transform_items = function(ctx, items)
							local function client_exists(bufnr, name)
								for _, client in ipairs(vim.lsp.get_clients({ bufnr = bufnr })) do
									if client.name == name then
										return true
									end
								end
								return false
							end

							local function filter_emmet_if_outside_elements(ctx, items)
								local bufnr = ctx.bufnr
								local lsp_name = "emmet_language_server"
								if not client_exists(bufnr, lsp_name) then
									return items
								end

								local ft = vim.bo[bufnr].filetype
								local embedded_fts = { "vue", "typescriptreact", "javascriptreact", "svelte" }
								if not vim.tbl_contains(embedded_fts, ft) then
									return items
								end

								local ts_utils = require("nvim-treesitter.ts_utils")
								local node = ts_utils.get_node_at_cursor()
								local emmet_nodes = { "jsx_element", "template_element", "style_element" }
								local not_emmet_nodes = { "script_element" }

								while node do
									local t = node:type()
									if vim.tbl_contains(emmet_nodes, t) then
										return items
									elseif vim.tbl_contains(not_emmet_nodes, t) then
										break
									end
									node = node:parent()
								end

								return vim.tbl_filter(function(item)
									return item.client_name ~= lsp_name
								end, items)
							end

							local function penalize_radix_ui(ctx, items)
								local bufnr = ctx.bufnr
								local lsp_name = "vtsls"
								if not client_exists(bufnr, lsp_name) then
									return items
								end

								local ft = vim.bo[bufnr].filetype
								if vim.tbl_contains({ "typescriptreact", "javascriptreact" }, ft) then
									for _, item in ipairs(items) do
										local desc = item.labelDetails and item.labelDetails.description
										if desc and desc:find("^@radix%-ui/react") then
											item.score_offset = -1
										end
									end
								end
								return items
							end

							local function strip_zls_parentheses(ctx, items)
								local bufnr = ctx.bufnr
								local lsp_name = "zls"
								if not client_exists(bufnr, lsp_name) then
									return items
								end

								for _, item in ipairs(items) do
									if item.client_name == lsp_name then
										local stripped = item.label:match("^(.-)%s*%(")
										if stripped then
											item.label = stripped
										end
									end
								end

								return items
							end

							local transforms = {
								filter_emmet_if_outside_elements,
								penalize_radix_ui,
								-- strip_zls_parentheses,
							}

							local result = items
							for _, transform in ipairs(transforms) do
								local ok, new_result = pcall(transform, ctx, result)
								if ok then
									result = new_result
								else
									print("transform failed:", new_result)
								end
							end

							return result
						end,
					},
				},
			},
		},
	},
}

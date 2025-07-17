return {
	{
		"geril2207/magazine.nvim",
		name = "nvim-cmp",
		dev = false,
		enabled = false,
		branch = "docs-view-ts",
		event = "InsertEnter",
		opts = function()
			local luasnip = require("luasnip")

			local cmp = require("cmp")

			local function toggle_completion_menu()
				if cmp.visible() then
					cmp.close()
				else
					cmp.complete()
				end
			end

			local cmp_select = { behavior = cmp.SelectBehavior.Select }
			local confirm_options = {
				behavior = cmp.ConfirmBehavior.Insert,
				select = false,
			}

			return {
				preselect = cmp.PreselectMode.None,
				completion = {
					completeopt = "menu,menuone,noinsert",
				},
				snippet = {
					expand = function(args)
						luasnip.lsp_expand(args.body)
					end,
				},
				mapping = cmp.mapping.preset.insert({
					["<C-p>"] = function()
						if cmp.visible() then
							cmp.select_prev_item(cmp_select)
						else
							cmp.complete()
						end
					end,
					["<C-n>"] = function()
						if cmp.visible() then
							cmp.select_next_item(cmp_select)
						else
							cmp.complete()
						end
					end,
					["<C-k>"] = cmp.mapping.scroll_docs(-4),
					["<C-j>"] = cmp.mapping.scroll_docs(4),
					["<C-Space>"] = cmp.mapping(toggle_completion_menu, { "i", "c" }),
					["<C-s>"] = cmp.mapping(toggle_completion_menu, { "i", "c" }),
					["<CR>"] = cmp.mapping.confirm(confirm_options),
					["<Tab>"] = cmp.mapping(function(fallback)
						if cmp.visible() and cmp.get_selected_entry() then
							cmp.confirm(confirm_options)
						elseif luasnip.jumpable(1) then
							luasnip.jump(1)
						elseif luasnip.expandable() then
							luasnip.expand()
						else
							fallback()
						end
					end, { "i", "s" }),
					["<S-Tab>"] = cmp.mapping(function(fallback)
						if luasnip.jumpable(-1) then
							luasnip.jump(-1)
						elseif cmp.visible() then
							cmp.select_prev_item()
						else
							fallback()
						end
					end, { "i", "s" }),
				}),
				formatting = {
					fields = { "kind", "abbr", "menu" },
					format = function(_, vim_item)
						local MAX_ABBR_WIDTH, MAX_MENU_WIDTH = 40, 20
						local ellipsis = require("my.icons").misc.ellipsis
						local symbol_kinds = require("my.icons").symbol_kinds

						-- Add the icon.
						vim_item.kind = (symbol_kinds[vim_item.kind] or symbol_kinds.Text)

						-- Truncate the label.
						if vim.api.nvim_strwidth(vim_item.abbr) > MAX_ABBR_WIDTH then
							vim_item.abbr = vim.fn.strcharpart(vim_item.abbr, 0, MAX_ABBR_WIDTH) .. ellipsis
						end

						-- Truncate the description part.
						if vim.api.nvim_strwidth(vim_item.menu or "") > MAX_MENU_WIDTH then
							vim_item.menu = vim.fn.strcharpart(vim_item.menu, 0, MAX_MENU_WIDTH) .. ellipsis
						end

						return vim_item
					end,
				},
				sources = cmp.config.sources({
					{ name = "nvim_lsp" },
					{ name = "luasnip" },
					{ name = "async_path" },
				}, {
					{ name = "buffer", keyword_length = 3 },
				}),
				sorting = {
					comparators = {
						cmp.config.compare.exact,
						cmp.config.compare.score,
						cmp.config.compare.offset,
						cmp.config.compare.length,
						cmp.config.compare.locality,

						-- copied from cmp-under, but I don't think I need the plugin for this.
						-- I might add some more of my own.
						function(entry1, entry2)
							local _, entry1_under = entry1.completion_item.label:find("^_+")
							local _, entry2_under = entry2.completion_item.label:find("^_+")
							entry1_under = entry1_under or 0
							entry2_under = entry2_under or 0
							if entry1_under > entry2_under then
								return false
							elseif entry1_under < entry2_under then
								return true
							end
						end,

						cmp.config.compare.kind,
						cmp.config.compare.sort_text,
						cmp.config.compare.order,
					},
				},
				performance = {
					max_view_entries = 25,
				},
			}
		end,
		dependencies = {
			{ "iguanacucumber/mag-nvim-lsp", name = "cmp-nvim-lsp", opts = {} },
			{ "iguanacucumber/mag-buffer", name = "cmp-buffer" },
			{ "https://codeberg.org/FelipeLema/cmp-async-path", name = "async_path" },
			"saadparwaiz1/cmp_luasnip",
			"L3MON4D3/LuaSnip",
		},
	},
}

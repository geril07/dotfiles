return {
	{
		"L3MON4D3/LuaSnip",
		lazy = true,
		build = "make install_jsregexp",
		config = function()
			local luasnip = require("luasnip")

			luasnip.setup({
				region_check_events = "InsertEnter",
				delete_check_events = "TextChanged,InsertLeave,InsertEnter",
				update_events = "TextChanged,TextChangedI",
			})

			local s = luasnip.snippet
			local i = luasnip.insert_node
			local f = luasnip.function_node
			local d = luasnip.dynamic_node
			local sn = luasnip.snippet_node
			local fmt = require("luasnip.extras.fmt").fmt

			local extras = require("luasnip.extras")
			local rep = extras.rep

			luasnip.setup({
				region_check_events = "InsertEnter",
				-- delete_check_events = "TextChanged,InsertLeave,InsertEnter",
				update_events = "TextChanged,TextChangedI",
			})

			-- vim.api.nvim_create_autocmd("ModeChanged", {
			-- 	group = vim.api.nvim_create_augroup("unlink_snippet", { clear = true }),
			-- 	desc = "Cancel the snippet session when leaving insert mode",
			-- 	pattern = { "s:n", "i:*" },
			-- 	callback = function(args)
			-- 		if
			-- 			luasnip.session
			-- 			and luasnip.session.current_nodes[args.buf]
			-- 			and not luasnip.session.jump_active
			-- 			and not luasnip.choice_active()
			-- 		then
			-- 			luasnip.unlink_current()
			-- 		end
			-- 	end,
			-- })

			require("luasnip.loaders.from_vscode").lazy_load()

			local filename = function()
				local name = vim.split(vim.fn.fnamemodify(vim.fn.expand("%"), ":t"), ".", true)
				return name[1] or ""
			end

			local js_snippets = {
				s("clo", fmt('console.log("{} :", {})', { i(1, "value"), rep(1) })),
				s("clg", fmt("console.log({})", { i(1, "value") })),
				s(
					"useStateSnippet",
					fmt("const [{value}, {setValue}] = useState({initValue})", {
						value = i(1, "value"),
						setValue = f(function(value_table)
							local value = value_table[1][1]
							local first_upper = value:gsub("^%l", string.upper)
							return "set" .. first_upper
						end, { 1 }),
						initValue = i(2, "initialValue"),
					})
				),
				s("imp", fmt("import {} from '{}'", { i(2, "module"), i(1, "") })),
				s("dob", fmt("const {{{values}}} = {obj}", { values = i(2, ""), obj = i(1, "") })),
				s("dar", fmt("const [{values}] = {arr}", { values = i(2, ""), arr = i(1, "") })),
				s("sti", fmt("setInterval(() => {}, {})", { i(1, ""), i(2, "") })),
				s("sto", fmt("setTimeout(() => {}, {})", { i(1, ""), i(2, "") })),
				s(
					"rhk",
					fmt("export const {} = ({}) => {}", {
						d(1, function()
							return sn(nil, {
								i(1, filename()),
							})
						end),
						i(2),
						i(3),
					})
				),
			}
			local add_to = { "typescriptreact", "javascriptreact", "typescript", "javascript", "astro", "vue", "svelte" }
			for _, lang in ipairs(add_to) do
				luasnip.add_snippets(lang, js_snippets)
			end
		end,
		dependencies = {

			{ "geril07/friendly-snippets", lazy = true },
			{
				"saadparwaiz1/cmp_luasnip",
				lazy = true,
				enabled = false,
			},
		},
	},
}

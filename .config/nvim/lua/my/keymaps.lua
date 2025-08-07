local map_utils = require("my.utils.map")
local map = map_utils.map
local map_tbl = map_utils.map_tbl
local mcmd = map_utils.cmd

local prev_amount = 15
local function get_amount_of_scrolling_lines()
	local firstline = vim.fn.line("w0")
	local lastline = vim.fn.line("w$")

	-- when last line of document <C-u> scrolls <10 lines
	prev_amount = math.max(math.floor((lastline - firstline) / 2), prev_amount)
	return prev_amount
end

local cmd = vim.cmd
local function execute_scroll(direction, history)
	history = history or false
	local visible_lines_to_scroll = get_amount_of_scrolling_lines()
	if history then
		cmd("normal! m'")
	end
	cmd("normal!" .. visible_lines_to_scroll .. direction)
	cmd("normal! zz")
end

map_tbl({
	nsi = {
		["<Esc>"] = {
			function()
				if require("luasnip").expand_or_jumpable() then
					require("luasnip").unlink_current()
				end
				return "<Esc>"
			end,
			{ expr = true },
		},
	},

	i = {
		["jk"] = { "<ESC>", { remap = true } },
		["jj"] = { "<ESC>", { remap = true } },
		["<C-v>"] = { '<ESC>"+pa', { remap = true } },

		["<M-k>"] = { vim.lsp.buf.signature_help },
	},

	n = {
		["j"] = "gj",
		["k"] = "gk",
		["<A-j>"] = ":m +1 <CR>",
		["<A-k>"] = ":m -2 <CR>",
		["<C-v>"] = '"+p',
		["<leader>b"] = "<C-o>",
		["<leader>n"] = "<C-i>",
		["<C-n>"] = mcmd("noh"),
		["<leader>e"] = mcmd("NvimTreeFocus"),
		["<leader>ab"] = mcmd("NvimTreeClose"),
		["K"] = { "<ESC>", { remap = true } },
		["<C-z>"] = mcmd("undo"),
		["<C-Z>"] = mcmd("redo"),
		["<C-s>"] = mcmd("silent! w"),
		["Y"] = '"+y',
		["M"] = "`",

		["<Tab>"] = mcmd("tabnext"),
		["<S-Tab>"] = mcmd("tabprev"),

		["<leader>sb"] = mcmd("Lspsaga show_buf_diagnostics"),
		["<leader>sw"] = mcmd("Lspsaga show_workspace_diagnostics"),
		["<leader>so"] = mcmd("Lspsaga outline"),
		["<leader>sh"] = mcmd("Lspsaga hover_doc"),
		["<leader>cd"] = mcmd("Lspsaga show_line_diagnostics"),
		["gp"] = mcmd("Lspsaga peek_definition"),

		["<leader>ha"] = mcmd("lua require('harpoon.mark').add_file()"),
		["<leader>hl"] = mcmd("lua require('harpoon.ui').toggle_quick_menu()"),

		["<leader>tc"] = mcmd("TSContext toggle"),

		["<A-z>"] = function()
			vim.wo.wrap = not vim.wo.wrap
		end,

		["gD"] = { vim.lsp.buf.declaration },
		["gh"] = { vim.lsp.buf.hover },

		["<leader>k"] = { vim.lsp.buf.signature_help },
		["<leader>r"] = { vim.lsp.buf.rename },
		["<leader>la"] = { vim.lsp.buf.code_action },

		["<leader>ld"] = function()
			vim.diagnostic.open_float({
				scope = "line",
				source = "if_many",
			})
		end,

		["]e"] = {
			function()
				vim.diagnostic.jump({ count = 1, float = true, severity = vim.diagnostic.severity.ERROR })
			end,
		},
		["[e"] = {
			function()
				vim.diagnostic.jump({ count = -1, float = true, severity = vim.diagnostic.severity.ERROR })
			end,
		},

		["]d"] = {
			function()
				vim.diagnostic.jump({ count = 1, float = true })
			end,
		},
		["[d"] = {
			function()
				vim.diagnostic.jump({ count = -1, float = true })
			end,
		},
	},

	nv = {
		["<leader>ca"] = mcmd("Lspsaga code_action"),

		["<leader>gs"] = mcmd("Gitsigns"),
		["<leader>gp"] = mcmd("Gitsigns preview_hunk"),
		["<leader>gbs"] = mcmd("Gitsigns stage_buffer"),
		["<leader>ghs"] = mcmd("Gitsigns stage_hunk"),
		["<leader>ghu"] = mcmd("Gitsigns undo_stage_hunk"),
		["]g"] = mcmd("Gitsigns next_hunk"),
		["[g"] = mcmd("Gitsigns prev_hunk"),

		["<C-d>"] = function()
			execute_scroll("j")
		end,

		["<C-u>"] = function()
			execute_scroll("k")
		end,
	},

	v = {
		["<A-j>"] = ":m '>+1<CR>gv=gv",
		["<A-k>"] = ":m '<-2<CR>gv=gv",
		["<C-v>"] = '"+p',
		["<leader>p"] = [["_dP]],
		["Y"] = '"+y',
		["y"] = "ygv<ESC>",
		["<C-c>"] = '"+y',
		["K"] = { "<ESC>", { remap = true } },
		["<"] = "<gv",
		[">"] = ">gv",
	},

	t = {
		["<ESC>"] = "<C-\\><C-n>",
	},
})

---@param index integer
local function go_to_tab(index)
	local list_tabs = vim.api.nvim_list_tabpages()

	for i = 1, #list_tabs, 1 do
		if index == i then
			pcall(function()
				vim.api.nvim_set_current_tabpage(list_tabs[index])
			end)
		end
	end
end

for i = 1, 9, 1 do
	if vim.fn.has("macunix") == 1 then
		map("n", string.format("<D-%s>", i), function()
			go_to_tab(i)
		end)
	else
		map("n", string.format("<A-%s>", i), function()
			go_to_tab(i)
		end)
	end
	map("n", string.format("<leader>%s", i), string.format(':lua require("harpoon.ui").nav_file(%s)<CR>', i))
end

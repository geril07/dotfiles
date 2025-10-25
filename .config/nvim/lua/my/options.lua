vim.g.mapleader = " "

vim.o.cmdheight = 1
vim.o.laststatus = 3
vim.o.signcolumn = "yes"

vim.o.termguicolors = true

vim.o.number = true
vim.o.relativenumber = true
vim.o.so = 10

vim.o.swapfile = false
vim.o.undofile = true

vim.o.swb = "usetab,useopen,uselast"

vim.opt.expandtab = true
vim.opt.shiftwidth = 2
vim.opt.tabstop = 2

vim.o.wrap = false

vim.o.splitright = true
vim.o.splitbelow = true

vim.o.mouse = "a"
vim.o.guicursor = "i:block"
-- vim.o.guicursor = ""

vim.o.showtabline = 1

vim.o.clipboard = "unnamedplus"

vim.o.cursorlineopt = "number"
vim.o.cursorline = false

vim.o.updatetime = 250
vim.o.timeoutlen = 500
vim.o.ttimeoutlen = 10

-- Case insensitive searching UNLESS /C or the search has capitals.
vim.o.ignorecase = true
vim.o.smartcase = true

-- folds
vim.o.foldcolumn = "1"
vim.o.foldlevelstart = 99
vim.wo.foldtext = ""

-- -- Show whitespace.
-- vim.opt.list = true
-- vim.opt.listchars = { space = "⋅", trail = "⋅", tab = "  ↦" }

local arrows = require("my.icons").arrows
-- UI characters.
vim.opt.fillchars = {
	eob = " ",
	fold = " ",
	foldclose = arrows.right,
	foldopen = arrows.down,
	foldinner = " ",
	foldsep = " ",
}

-- Use rounded borders for floating windows.
vim.o.winborder = "rounded"

vim.o.spelllang = "en_us,ru_ru"

local en = [[`qwertyuiop[]asdfghjkl;'zxcvbnm]]
local ru = [[ёйцукенгшщзхъфывапролджэячсмить]]
local en_shift = [[~QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>]]
local ru_shift = [[ËЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ]]

local function escape(str)
	local escape_chars = [[;,."|\]]
	return vim.fn.escape(str, escape_chars)
end

local langmap = vim.fn.join({
	escape(ru_shift) .. ";" .. escape(en_shift),
	escape(ru) .. ";" .. escape(en),
}, ",")

vim.o.langmap = langmap

vim.g.mapleader = " "

vim.o.swapfile = false
vim.o.signcolumn = "yes"
vim.o.ignorecase = true
vim.o.cmdheight = 1
vim.o.termguicolors = true
vim.o.spelllang = "en_us,ru_ru"
vim.o.number = true
vim.o.relativenumber = true

vim.o.so = 10
vim.o.undofile = true
vim.o.mouse = "a"
vim.o.swb = "usetab,useopen,uselast"
vim.o.tabstop = 2
vim.o.softtabstop = 2
vim.o.wrap = false
vim.o.shiftwidth = 2
vim.o.splitright = true
vim.o.splitbelow = true
vim.o.showtabline = 1
-- vim.o.guicursor = ""

vim.o.guicursor = "i:block"

vim.o.expandtab = true
vim.o.smartindent = true

vim.o.clipboard = "unnamedplus"
vim.o.cursorlineopt = "number"

vim.o.updatetime = 250
vim.o.timeoutlen = 500
vim.o.cursorline = false
vim.o.showmode = false
vim.o.laststatus = 3

-- folds
vim.o.foldcolumn = "0"
vim.o.foldlevelstart = 99
vim.wo.foldtext = ""

local arrows = require("my.icons").arrows
-- UI characters.
vim.opt.fillchars = {
	eob = " ",
	fold = " ",
	foldclose = arrows.right,
	foldopen = arrows.down,
	foldsep = " ",
}

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

local g = vim.g
local opt = vim.opt
local api = vim.api

g.mapleader = " "
-- g.translate_source = "ru"
-- g.translate_target = "en"

opt.fillchars = "eob: "
opt.swapfile = false
opt.signcolumn = "yes"
opt.ignorecase = true
opt.cmdheight = 1
opt.termguicolors = true
opt.spelllang = { "en_us", "ru_ru" }
opt.number = true
opt.relativenumber = true
opt.so = 10
opt.undofile = true
opt.mouse = "a"
opt.swb = "usetab,useopen,uselast"
opt.tabstop = 2
opt.softtabstop = 2
opt.wrap = false
opt.shiftwidth = 2
opt.splitright = true
opt.splitbelow = true
opt.showtabline = 1
-- opt.guicursor = ""
opt.guicursor:append("i:block")

opt.expandtab = true
opt.smartindent = true

opt.clipboard = "unnamedplus"
opt.cursorlineopt = "number"

opt.updatetime = 250
opt.timeoutlen = 500
opt.cursorline = false
opt.showmode = false
opt.laststatus = 3

api.nvim_create_autocmd("TextYankPost", {
  group = api.nvim_create_augroup("YankHighlight", { clear = true }),
  callback = function()
    vim.highlight.on_yank({ higroup = "IncSearch", timeout = 100 })
  end,
})

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

vim.opt.langmap = langmap

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
	vim.fn.system({
		"git",
		"clone",
		"--filter=blob:none",
		"https://github.com/folke/lazy.nvim.git",
		"--branch=stable", -- latest stable release
		lazypath,
	})
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup("plugins", {
	change_detection = {
		enabled = false,
	},
	dev = {
		-- directory where you store your local plugin projects
		path = "~/my/code/nvim-plugins",
		fallback = false, -- Fallback to git when local plugin doesn't exist
	},

	performance = {
		enabled = true,
		rtp = {
			-- Stuff I don't use.
			disabled_plugins = {
				"gzip",
				"netrwPlugin",
				"rplugin",
				"tarPlugin",
				"tohtml",
				"tutor",
				"zipPlugin",
			},
		},
	},
})

require("my.winbar")
require("my.settings")
require("my.keymaps")
require("my.gui")
require("my.commands")
pcall(function()
	require("vim._extui").enable({})
end)

-- vim.api.nvim_create_autocmd("CursorMovedI", {
-- 	callback = function()
-- 		print("cursor_moved", vim.inspect(vim.api.nvim_win_get_cursor(0)))
-- 	end,
-- })

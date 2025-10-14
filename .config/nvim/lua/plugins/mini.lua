return {
	{
		"nvim-mini/mini.hipatterns",
		version = false,
		opts = {},
	},
	{
		"nvim-mini/mini.indentscope",
		version = false,
		enabled = false,
		opts = {

			symbol = "▎", --"▏",
		},
	},
	-- In case i would like to ignore import/export/from/etc
	--   _G.cursorword_blocklist = function()
	--   local curword = vim.fn.expand('<cword>')
	--   local filetype = vim.api.nvim_buf_get_option(0, 'filetype')
	--   local blocklist = {}
	--   -- Add any disabling global or filetype-specific logic here
	--   if filetype == 'lua' then
	--     blocklist = {'local'}
	--   elseif filetype == 'javascript' then
	--     blocklist = {'import'}
	--   end
	--
	--   vim.b.minicursorword_disable = vim.tbl_contains(blocklist, curword)
	-- end
	--
	-- -- Make sure to add this autocommand *before* calling module's `setup()`.
	-- vim.cmd([[au CursorMoved * lua _G.cursorword_blocklist()]])
	--
	-- require('mini.cursorword').setup()
	{
		"nvim-mini/mini.cursorword",
		version = false,
		-- too much unneeded stuff is highlighted with it
		enabled = false,
		opts = { delay = 300 },
	},
}

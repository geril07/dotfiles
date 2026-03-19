local map = require("my.utils.map").map

return {
	{
		"lewis6991/gitsigns.nvim",
		-- tag = 'release' -- To use the latest release (do not use this if you run Neovim nightly or dev builds!)
		event = "VeryLazy",
		opts = {
			current_line_blame_opts = {
				delay = 200,
			},
			on_attach = function()
				local gs = package.loaded.gitsigns

				map("n", "[h", gs.prev_hunk)
				map("n", "]h", gs.next_hunk)
			end,
		},
	},
	-- Generate and open GitHub links.
	{
		"linrongbin16/gitlinker.nvim",
		opts = {},
		init = function()
			vim.cmd([[cab gl GitLink]])
		end,
		cmd = { "GitLink" },
		-- keys = {
		-- 	{ "<leader>gc", "<cmd>GitLink<cr>", mode = { "n", "v" }, desc = "Yank git link" },
		-- 	{ "<leader>go", "<cmd>GitLink! blame<cr>", mode = { "n", "v" }, desc = "Open git link" },
		-- },
	},
}

return {
	{
		"stevearc/dressing.nvim",
		event = "VeryLazy",
		config = function()
			require("dressing").setup({
				input = { enabled = true, win_options = { winblend = 0, sidescrolloff = 7 } },
				select = { enabled = false },
			})
		end,
	},
}

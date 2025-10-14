return {
	{
		"Wansmer/treesj",
		keys = { { "gm", "<cmd>TSJToggle<cr>", desc = "Toggle Block" } },
		dependencies = { "nvim-treesitter/nvim-treesitter" },
		opts = { use_default_keymap = false, max_join_length = 1000 },
	},
	{
		"folke/persistence.nvim",
		event = "BufReadPre",
		opts = {},
	},
	{
		"NStefan002/screenkey.nvim",
		event = "VeryLazy",
	},
	{
		"folke/lazydev.nvim",
		ft = "lua", -- only load on lua files
		opts = {
			library = {
				-- See the configuration section for more details
				-- Load luvit types when the `vim.uv` word is found
				{ path = "${3rd}/luv/library", words = { "vim%.uv" } },
			},
		},
	},
}

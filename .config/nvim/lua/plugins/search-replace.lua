-- Search and replace in multiple files.
return {
	{
		"nvim-pack/nvim-spectre",
		dependencies = "nvim-lua/plenary.nvim",
		event = "VeryLazy",
		keys = {
			{
				"<leader>cs",
				function()
					require("spectre").open()
				end,
				desc = "Search and replace",
			},
		},
	},
}

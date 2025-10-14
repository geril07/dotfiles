return {
	{
		"lukas-reineke/indent-blankline.nvim",
		main = "ibl",
		event = "VeryLazy",
		enabled = true,
		opts = {
			indent = { char = "▏" },
			scope = {
				enabled = false,
				show_start = false,
				show_end = false,
				priority = 500,
				include = {

					node_type = { lua = { "return_statement", "table_constructor" } },
				},
			},
		},
	},
}

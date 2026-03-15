return {
	{
		"nvim-tree/nvim-web-devicons",
		lazy = true,
		opts = {
			override = {
				["gql"] = {
					icon = "󰡷",
					color = "#e535ab",
					cterm_color = "199",
					name = "GQL",
				},
				["graphql"] = {
					icon = "󰡷",
					color = "#e535ab",
					cterm_color = "199",
					name = "GQL",
				},
				["ts"] = {
					icon = "",
					color = "#519aba",
					name = "TS",
				},
			},
		},
	},
	{
		"nvim-tree/nvim-tree.lua",
		priority = 100,
		lazy = false,
		-- commit = "d54a1875a91e1a705795ea26074795210b92ce7f",
		dev = false,
		dependencies = {
			"nvim-tree/nvim-web-devicons",
		},
		config = function()
			require("my.nvim-tree")
		end,
	},
}

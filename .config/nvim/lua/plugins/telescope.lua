return {
	{
		"nvim-telescope/telescope.nvim",
		dev = false,
		enabled = true,
		dependencies = {
			"nvim-lua/plenary.nvim",
			{
				"nvim-telescope/telescope-fzf-native.nvim",
				build = "make",
			},
		},
		cmd = "Telescope",
		config = function()
			local actions = require("telescope.actions")
			local action_layout = require("telescope.actions.layout")

			require("telescope").setup({
				defaults = {
					sorting_strategy = "ascending",

					layout_strategy = "vertical",
					layout_config = {
						vertical = {
							preview_cutoff = 1,
							prompt_position = "top",
							mirror = true,
						},
					},
					-- layout_config = {
					-- 	horizontal = {
					-- 		prompt_position = "top",
					-- 	},
					-- },
					mappings = {
						i = {
							["<ESC>"] = actions.close,
							["<M-p>"] = action_layout.toggle_preview,
							["<M-k>"] = actions.cycle_history_prev,
							["<M-j>"] = actions.cycle_history_next,
							["<C-j>"] = actions.preview_scrolling_down,
							["<C-k>"] = actions.preview_scrolling_up,
							["<C-l>"] = actions.preview_scrolling_right,
							["<C-h>"] = actions.preview_scrolling_left,
							["<M-s>"] = actions.select_vertical,
							["<M-h>"] = actions.select_horizontal,
							["<C-u>"] = false,
						},
						n = {
							["q"] = actions.close,
							["o"] = actions.select_default,
						},
					},
					file_ignore_patterns = {
						"^.pnpm-store",
						"build/",
						"dist/",
						"node_modules/",
						"^.next",
						"^.git",
						".png",
						".svg",
						".jpg",
						".mp3",
						".jpeg",
						".ttf",
						".eoff",
						".otf",
						".woff2",
						".woff",
						".eot",
						".gif",
						".tsbuildinfo",
					},
					path_display = { "truncate" },
				},
				pickers = {
					find_files = {
						hidden = true,
						no_ignore = false,
						find_command = vim.fn.executable("fd") == 1
								and { "fd", "--type", "f", "--path-separator", "/", "-E", '".git"' }
							or nil,
						previewer = true,

						sorting_strategy = "ascending",
					},

					live_grep = {
						-- additional_args = function()
						-- 	return { "--hidden" }
					},
					lsp_implementations = {
						initial_mode = "normal",
						layout_config = {
							preview_width = 80,
							mirror = true,
							width = 0.7,
						},
					},
					lsp_definitions = {
						show_line = true,
						path_display = { "tail" },
						file_ignore_patterns = {},
					},
					lsp_references = {
						previewer = false,
						show_line = true,
						path_display = { "tail" },
						file_ignore_patterns = {},
					},
				},
				extensions = {
					fzf = {
						fuzzy = true, -- false will only do exact matching
						override_generic_sorter = true, -- override the generic sorter
						override_file_sorter = true, -- override the file sorter
						case_mode = "smart_case", -- or "ignore_case" or "respect_case"
						-- the default case_mode is "smart_case"
					},
				},
			})

			require("telescope").load_extension("fzf")

			local tree_api = require("nvim-tree.api")
			local tree_utils = require("my.nvim-tree.utils")
			local api = vim.api

			api.nvim_create_autocmd("User", {
				pattern = "TelescopeFindPre",
				callback = function()
					if tree_utils.is_floating() then
						tree_api.tree.close()
					end
				end,
			})
		end,
	},
}

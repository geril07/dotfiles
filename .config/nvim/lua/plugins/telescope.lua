local map_utils = require("my.utils.map")
local mcmd = map_utils.cmd

return {
	{
		"nvim-telescope/telescope.nvim",
		dev = false,
		enabled = false,
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

		keys = {
			{ "<leader>snp", mcmd("Telescope neoclip plus"), silent = true },
			{ "<leader>sn", mcmd("Telescope neoclip"), silent = true },
			{ "<leader>snu", mcmd("Telescope neoclip unnamed"), silent = true },
			{ "<leader>sns", mcmd("Telescope neoclip star"), silent = true },
			{ "<leader>ff", mcmd("Telescope find_files"), silent = true },
			{ "<leader>p", mcmd("Telescope find_files"), silent = true },
			{ "<leader>P", mcmd("Telescope"), silent = true },
			{ "<leader>fp", mcmd("Telescope resume"), silent = true },
			{ "<C-p>", mcmd("Telescope find_files"), silent = true },
			{ "<leader>fz", mcmd("Telescope live_grep"), silent = true },
			{
				"<leader>fx",
				function()
					require("telescope.builtin").grep_string({
						search = vim.fn.input("Grep: "),
					})
				end,
				silent = true,
			},
			{ "<leader>fl", mcmd("Telescope grep_string"), silent = true },
			{ "<leader>fb", mcmd("Telescope buffers"), silent = true },
			{ "<leader>fg", mcmd("Telescope git_files"), silent = true },
			{ "<leader>u", mcmd("Telescope undo"), silent = true },
			{ "<leader>fh", mcmd("Telescope harpoon marks initial_mode=normal"), silent = true },
			{ "<leader>fm", mcmd("Telescope marks"), silent = true },
			{ "<leader>fs", mcmd("Telescope lsp_document_symbols"), silent = true },
			{ "<leader>fw", mcmd("Telescope lsp_dynamic_workspace_symbols"), silent = true },
			{ "gf", mcmd("Telescope lsp_references"), silent = true },
			{ "gt", mcmd("Telescope lsp_type_definitions"), silent = true },
			{ "<leader>fd", mcmd("Telescope diagnostics "), silent = true },

			{ "<leader>d", mcmd("Telescope lsp_definitions"), silent = true },
			{ "gd", mcmd("Telescope lsp_definitions"), silent = true },

			{ "gi", mcmd("Telescope lsp_implementations"), silent = true },
		},
	},
}

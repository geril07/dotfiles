local map_utils = require("my.utils.map")
local mcmd = map_utils.cmd
return {
	{
		"ibhagwan/fzf-lua",
		-- optional for icon support
		dependencies = { "nvim-tree/nvim-web-devicons" },
		cmd = "FzfLua",
		event = "VeryLazy",
		dev = false,
		enabled = true,
		opts = function()
			local actions = require("fzf-lua.actions")
			local tree_api = require("nvim-tree.api")
			local tree_utils = require("my.nvim-tree.utils")

			return {
				{ "hide", "border-fused" },
				winopts = {
					title = "",
					height = 0.85, -- window height
					width = 0.80, -- window width
					row = 0.50, -- window row position (0=top, 1=bottom)
					col = 0.50, -- window col position (0=left, 1=right)
					preview = {
						scrollbar = false,
						layout = "vertical",
						vertical = "down:50%",
						hidden = true,
					},

					-- on_create = function()
					-- 	local tree_api = require("nvim-tree.api")
					-- 	local tree_utils = require("my.nvim-tree.utils")
					--
					-- 	if tree_utils.is_floating() then
					-- 		tree_api.tree.close()
					-- 	end
					-- end,
				},

				actions = {
					files = {
						true,
						["enter"] = actions.file_switch_or_edit,
						-- ["enter"] = actions.file_edit_or_qf,
						["alt-h"] = actions.toggle_hidden,
						["alt-s"] = actions.file_split,
						["alt-v"] = actions.file_vsplit,
					},
				},

				keymap = {

					builtin = {
						false,

						["<M-Esc>"] = "hide", -- hide fzf-lua, `:FzfLua resume` to continue
						["<M-p>"] = "toggle-preview",
						["<M-f>"] = "toggle-fullscreen",
						["<C-j>"] = "preview-half-page-down",
						["<C-k>"] = "preview-half-page-up",
						["<C-l>"] = "preview-half-page-left",
						["<C-h>"] = "preview-half-page-right",
					},

					fzf = {
						false,
					},
				},

				files = {
					winopts = { preview = { hidden = false } },
					cwd_prompt = false,
				},

				oldfiles = {
					cwd_only = true,
				},

				lsp = {
					symbols = {
						winopts = { preview = { hidden = false } },
						symbol_icons = require("my.icons").symbol_kinds,
					},
				},

				diagnostics = {
					multiline = 1,
				},

				helptags = {
					actions = {
						["alt-s"] = actions.help,
						["alt-v"] = actions.help_vert,
					},
				},
			}
		end,
		keys = {
			{ "<leader>ff", mcmd("FzfLua files"), silent = true },
			{ "<leader>p", mcmd("FzfLua files"), silent = true },
			{ "<C-p>", mcmd("FzfLua files"), silent = true },
			{ "<leader>P", mcmd("FzfLua"), silent = true },
			{ "<leader>fp", mcmd("FzfLua resume"), silent = true },
			{ "<leader>fz", mcmd("FzfLua live_grep"), silent = true },
			{ "<leader>fx", mcmd("FzfLua grep"), silent = true },
			{ "<leader>fl", mcmd("FzfLua grep_cword"), silent = true },
			{ "<leader>fb", mcmd("FzfLua buffers"), silent = true },
			{ "<leader>fr", mcmd("FzfLua oldfiles"), silent = true },
			{ "<leader>fg", mcmd("FzfLua git_files"), silent = true },
			{ "<leader>fm", mcmd("FzfLua marks"), silent = true },
			{ "<leader>fs", mcmd("FzfLua lsp_document_symbols"), silent = true },
			{ "<leader>fw", mcmd("FzfLua lsp_workspace_symbols"), silent = true },
			{ "gf", mcmd("FzfLua lsp_references"), silent = true },
			{ "gt", mcmd("FzfLua lsp_typedefs"), silent = true },
			{ "<leader>fd", mcmd("FzfLua lsp_workspace_diagnostics"), silent = true },
			{ "<leader>d", mcmd("FzfLua lsp_definitions"), silent = true },
			{ "gd", mcmd("FzfLua lsp_definitions"), silent = true },
		},
	},
}

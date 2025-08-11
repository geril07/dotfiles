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
			-- vim.env.FZF_DEFAULT_OPTS = ""

			require("fzf-lua").register_ui_select(function()
				return {
					winopts = {
						width = 0.5,
						height = 0.4,
						row = 0.50, -- window row position (0=top, 1=bottom)
						col = 0.50, -- window col position (0=left, 1=right)
					},
				}
			end)

			return {
				{ "hide", "border-fused" },
				fzf_opts = { ["--keep-right"] = "" },
				-- fzf_colors = {
				-- 	["hl"] = { "fg", "TelescopeMatching", "reverse" },
				-- 	["hl+"] = { "fg", "TelescopeMatching", "reverse" },
				-- },

				defaults = {
					formatter = "path.dirname_first",
				},

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
					treesitter = false,

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

				lines = {},
				blines = {},
				files = {
					winopts = { preview = { hidden = false, delay = 100 } },
					cwd_prompt = false,
					fzf_opts = { ["--tiebreak"] = "length" },
				},

				oldfiles = {
					cwd_only = true,
				},

				lsp = {
					winopts = { preview = { hidden = false } },

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
		keys = map_utils.wrap_into_silent({
			{ "<leader>ffl", mcmd("FzfLua lines") },
			{ "<leader>ffb", mcmd("FzfLua blines") },
			{ "<leader>p", mcmd("FzfLua files") },
			{ "<C-p>", mcmd("FzfLua files") },
			{ "<leader>P", mcmd("FzfLua") },
			{ "<leader>fp", mcmd("FzfLua resume") },
			{ "<leader>fz", mcmd("FzfLua live_grep") },
			{ "<leader>fz", mcmd("FzfLua grep_visual"), mode = "v" },
			{ "<leader>fx", mcmd("FzfLua grep") },
			{ "<leader>fl", mcmd("FzfLua grep_cword") },
			{ "<leader>fb", mcmd("FzfLua buffers") },
			{ "<leader>fr", mcmd("FzfLua oldfiles") },
			{ "<leader>fg", mcmd("FzfLua git_files") },
			{ "<leader>fm", mcmd("FzfLua marks") },
			{ "<leader>fs", mcmd("FzfLua lsp_document_symbols") },
			{ "<leader>fw", mcmd("FzfLua lsp_workspace_symbols") },
			{ "gf", mcmd("FzfLua lsp_references") },
			{ "gt", mcmd("FzfLua lsp_typedefs") },
			{ "<leader>fd", mcmd("FzfLua lsp_workspace_diagnostics") },
			{ "<leader>d", mcmd("FzfLua lsp_definitions") },
			{ "gd", mcmd("FzfLua lsp_definitions") },
		}),
	},
}

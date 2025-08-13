return {
	{
		"nvim-treesitter/nvim-treesitter",
		dependencies = {
			"nvim-treesitter/nvim-treesitter-textobjects",
			"nvim-treesitter/nvim-treesitter-context",
			"windwp/nvim-ts-autotag",
			{ "windwp/nvim-autopairs", opts = { disable_filetype = { "TelescopePrompt", "vim" } } },

			"JoosepAlviste/nvim-ts-context-commentstring",
		},
		event = "VeryLazy",
		build = ":TSUpdate",
		config = function()
			local function disable()
				local is_disable = false
				local ok, stats = pcall(vim.loop.fs_stat, vim.api.nvim_buf_get_name(vim.api.nvim_get_current_buf()))

				if ok and stats ~= nil and stats.size > 3500 * 100 then
					is_disable = true
					-- return true
				end

				return is_disable
			end

			require("nvim-treesitter.configs").setup({
				ensure_installed = {
					"query",
					"vim",
					"vimdoc",
					"javascript",
					"lua",
					"tsx",
					"typescript",
					"html",
					"scss",
					"css",
					"json",
					"prisma",
					"markdown",
					"markdown_inline",
					"python",
					"go",
					"rust",
					"dot",
					"bash",
					"jsdoc",
					"yaml",
					"vue",
					"cpp",
					"c",
				},
				sync_install = false,

				indent = {
					enable = true,
					-- disable = { "rust" },
				},

				highlight = {
					enable = true,
					additional_vim_regex_highlighting = false,
					disable = disable,
				},

				textobjects = {
					select = {
						enable = true,
						disable = disable,
						keymaps = {
							["af"] = "@function.outer",
							["if"] = "@function.inner",
							["ac"] = "@class.outer",
						},
					},
				},
			})

			require("nvim-ts-autotag").setup({
				enable = true,
				disable = disable,
				enable_close_on_slash = false,
				filetypes = {
					"htmldjango",
					"html",
					"javascript",
					"typescript",
					"javascriptreact",
					"typescriptreact",
					"svelte",
					"vue",
					"tsx",
					"jsx",
					"rescript",
					"xml",
					"php",
					"markdown",
					"glimmer",
					"handlebars",
					"hbs",
					"astro",
				},
			})

			require("ts_context_commentstring").setup({
				enable = true,
				disable = disable,
				enable_autocmd = false,
			})

			require("treesitter-context").setup({
				enable = false, -- Enable this plugin (Can be enabled/disabled later via commands)
				-- Avoid the sticky context from growing a lot.
				max_lines = 3,
				-- Match the context lines to the source code.
				multiline_threshold = 1,
				-- Disable it when the window is too small.
				min_window_height = 20,
			})
		end,
	},
}

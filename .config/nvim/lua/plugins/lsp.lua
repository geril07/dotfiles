-- vim.lsp.set_log_level(vim.log.levels.DEBUG)
--- HACK: Override `vim.lsp.util.stylize_markdown` to use Treesitter.
---@param bufnr integer
---@param contents string[]
---@param opts table
---@return string[]
---@diagnostic disable-next-line: duplicate-set-field
vim.lsp.util.stylize_markdown = function(bufnr, contents, opts)
	contents = vim.lsp.util._normalize_markdown(contents, {
		width = vim.lsp.util._make_floating_popup_size(contents, opts),
	})
	vim.bo[bufnr].filetype = "markdown"
	vim.treesitter.start(bufnr)
	vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, contents)

	return contents
end

local function get_cwd_root_dir(bufnr, cb)
	cb(vim.uv.cwd())
end

local function get_ts_root_dir(bufnr, cb)
	local fname = vim.uri_to_fname(vim.uri_from_bufnr(bufnr))

	local ts_root = vim.fs.find("tsconfig.json", { upward = true, path = fname })[1]
	-- Use the git root to deal with monorepos where TypeScript is installed in the root node_modules folder.
	local git_root = vim.fs.find(".git", { upward = true, path = fname })[1]

	if git_root then
		cb(vim.fn.fnamemodify(git_root, ":h"))
	elseif ts_root then
		cb(vim.fn.fnamemodify(ts_root, ":h"))
	else
		get_cwd_root_dir(bufnr, cb)
	end
end

return {
	{
		"neovim/nvim-lspconfig",
		lazy = true,
		event = "VeryLazy",
		-- commit = "4ea9083b6d3dff4ddc6da17c51334c3255b7eba5",
		config = function()
			require("mason-tool-installer").setup({
				ensure_installed = {
					"astro-language-server",
					"bash-language-server",
					"black",
					"clangd",
					"css-lsp",
					"cssmodules-language-server",
					"docker-compose-language-service",
					"emmet-language-server",
					"emmet-ls",
					"eslint-lsp",
					"eslint_d",
					"gopls",
					"html-lsp",
					"json-lsp",
					"lua-language-server",
					"prettier",
					"prettierd",
					"prisma-language-server",
					"python-lsp-server",
					"rust-analyzer",
					"shfmt",
					"sqlfmt",
					"sqls",
					"stylelint-lsp",
					"stylua",
					"tailwindcss-language-server",
					"vtsls",
					"yaml-language-server",
					"zls",
					"vue-language-server",
				},
			})

			require("mason").setup({
				ui = {
					icons = {
						package_installed = "✓",
						package_pending = "➜",
						package_uninstalled = "✗",
					},
				},
			})

			local capabilities = vim.lsp.protocol.make_client_capabilities()

			pcall(function()
				if package.loaded["blink.cmp"] then
					capabilities = require("blink.cmp").get_lsp_capabilities(capabilities)
				elseif package.loaded["cmp_nvim_lsp"] then
					capabilities = require("cmp_nvim_lsp").default_capabilities(capabilities)
				end
			end)

			local servers = {
				zls = {},
				gleam = {},
				ocamllsp = {},
				hls = {},

				vue_ls = {
					enabled = true,
					root_dir = get_ts_root_dir,
				},

				ts_ls = {
					enabled = false,
					root_dir = get_cwd_root_dir,
				},
				tsgo = {
					enabled = false,
				},
				vtsls = {
					enabled = true,
					root_dir = get_ts_root_dir,
					filetypes = {
						"javascript",
						"javascriptreact",
						"javascript.jsx",
						"typescript",
						"typescriptreact",
						"typescript.tsx",
						"vue",
					},
					settings = {
						vtsls = {
							autoUseWorkspaceTsdk = true,
							tsserver = {
								globalPlugins = {
									{
										name = "@vue/typescript-plugin",
										location = vim.fn.expand("$MASON/packages/vue-language-server")
											.. "/node_modules/@vue/language-server",
										languages = { "vue" },
										configNamespace = "typescript",
										enableForWorkspaceTypeScriptVersions = true,
									},
								},
							},

							experimental = {
								-- -- Inlay hint truncation.
								-- maxInlayHintLength = 30,
								-- For completion performance.
								completion = {
									enableServerSideFuzzyMatch = true,
								},
							},
						},

						typescript = {
							format = { enable = false },
							tsserver = {
								maxTsServerMemory = 8192,
							},
						},

						javascript = {
							format = { enable = false },
						},
					},
				},
				bashls = {},
				html = {},
				cssls = {},
				-- cssmodules_ls = {},
				-- stylelint_lsp = {},
				sqlls = {},
				jsonls = {
					filetypes = { "json", "jsonc" },
					settings = {
						json = {
							validate = { enable = true },
							format = { enable = false },
							-- Schemas https://www.schemastore.org
							schemas = require("schemastore").json.schemas(),
						},
					},
				},
				clangd = {
					cmd = {
						"clangd",
						"--clang-tidy",
						"--function-arg-placeholders=false",
					},
				},
				tailwindcss = {
					enabled = true,
					settings = {
						tailwindCSS = {
							classFunctions = { "cva", "cx", "cn", "twMerge" },
						},
					},
				},
				eslint = {
					enabled = true,
					root_markers = { ".eslintrc", ".eslintrc.js", ".eslintrc.json", "eslint.config.js", "eslint.config.mjs" },
					settings = { format = false },
				},
				pylsp = {
					formatter = true,
				},
				graphql = {
					enabled = false,
				},
				rust_analyzer = {
					formatter = true,
					settings = {
						["rust-analyzer"] = {
							completion = {
								callable = {
									snippets = "none",
								},
							},
						},
					},
				},
				lua_ls = {
					formatter = true,
				},
				astro = {},
				yamlls = {
					settings = {
						yaml = {
							-- Schemas https://www.schemastore.org
							schemas = {
								["http://json.schemastore.org/gitlab-ci.json"] = { ".gitlab-ci.yml" },
								["https://json.schemastore.org/bamboo-spec.json"] = {
									"bamboo-specs/*.{yml,yaml}",
								},
								["https://raw.githubusercontent.com/compose-spec/compose-spec/master/schema/compose-spec.json"] = {
									"docker-compose*.{yml,yaml}",
								},
								["http://json.schemastore.org/github-workflow.json"] = ".github/workflows/*.{yml,yaml}",
								["http://json.schemastore.org/github-action.json"] = ".github/action.{yml,yaml}",
								["http://json.schemastore.org/prettierrc.json"] = ".prettierrc.{yml,yaml}",
								["http://json.schemastore.org/stylelintrc.json"] = ".stylelintrc.{yml,yaml}",
								["http://json.schemastore.org/circleciconfig"] = ".circleci/**/*.{yml,yaml}",
								["http://json.schemastore.org/lazydocker.json"] = "lazydocker/**/*.{yml,yaml}",
								["https://taskfile.dev/schema.json"] = "**/Taskfile.{yml,yaml}",
							},
						},
					},
				},
				dockerls = {},
				prismals = {
					formatter = true,
				},
				gopls = {
					settings = { gopls = { completeFunctionCalls = false } },
					formatter = true,
				},
				emmet_language_server = {
					enabled = true,
					filetypes = {
						"eruby",
						"html",
						-- "javascript",
						"javascriptreact",
						"typescriptreact",
						"vue",
						"svelte",
						"css",
						"scss",
						"less",
						"sass",
						"pug",
					},
					init_options = {
						showSuggestionsAsSnippets = true,
						-- includeLanguages = {
						-- 	svelte = "html",
						-- },
					},
				},
				emmet_ls = {
					enabled = false,
					filetypes = {
						"astro",
						"css",
						"eruby",
						"html",
						"htmldjango",
						"less",
						"pug",
						"sass",
						"scss",
						"vue",
						"svelte",
					},
				},
			}

			--- Sets up LSP keymaps and autocommands for the given buffer.
			---@param client vim.lsp.Client
			---@param bufnr integer
			local on_attach = function(client, bufnr)
				local is_formatting_enabled = false
				-- Disable formatting for some servers to use external utils like prettier
				for key, value in pairs(servers) do
					if client.name == key and value.formatter == true then
						is_formatting_enabled = true
					end
				end
				client.server_capabilities.documentFormattingProvider = is_formatting_enabled

				-- Highlight references when holding
				if client:supports_method(vim.lsp.protocol.Methods.textDocument_documentHighlight) then
					vim.api.nvim_create_autocmd({ "CursorHold", "InsertLeave" }, {
						desc = "Highlight references under the cursor",
						buffer = bufnr,
						callback = vim.lsp.buf.document_highlight,
					})
					vim.api.nvim_create_autocmd({ "CursorMoved", "InsertEnter", "BufLeave" }, {
						desc = "Clear highlight references",
						buffer = bufnr,
						callback = vim.lsp.buf.clear_references,
					})
				end

				require("lsp_signature").on_attach({
					bind = false,
					doc_lines = 5,
					handler_opts = {
						border = "single", -- double, rounded, single, shadow, none, or a table of borders
					},
					hint_enable = true,
					hint_prefix = "",
					toggle_key = "<A-s>",
					select_signature_key = "<A-n>", -- cycle to next signature, e.g. '<M-n>' function overloading
					floating_window = false,
				}, bufnr)
			end

			for server, config in pairs(servers) do
				local is_server_enabled = config.enabled == nil and true or config.enabled

				local default_options = {
					on_attach = on_attach,
					capabilities = capabilities,
				}

				if is_server_enabled then
					vim.lsp.config(server, vim.tbl_deep_extend("force", default_options, config))
					vim.lsp.enable(server)
				end
			end

			local diagnostic_config = {
				update_in_insert = false,
				severity_sort = true,
				underline = {
					severity = {
						min = vim.diagnostic.severity.WARN,
					},
				},
				signs = {
					severity = {
						min = vim.diagnostic.severity.HINT,
					},
					text = {
						[vim.diagnostic.severity.ERROR] = " ",
						[vim.diagnostic.severity.WARN] = " ",
						[vim.diagnostic.severity.INFO] = " ",
						[vim.diagnostic.severity.HINT] = "󱌹 ",
					},
				},
				virtual_text = {
					severity = {
						min = vim.diagnostic.severity.WARN,
					},
				},
			}

			vim.diagnostic.config(diagnostic_config)

			vim.api.nvim_create_autocmd({ "BufNewFile", "BufRead" }, {
				pattern = { "**/node_modules/**", "node_modules", "/node_modules/*", "dist", "build" },
				callback = function()
					vim.diagnostic.enable(false, { bufnr = 0 })
				end,
			})
		end,
		dependencies = {
			"williamboman/mason.nvim",
			"WhoIsSethDaniel/mason-tool-installer.nvim",
			{
				"j-hui/fidget.nvim",
				event = "VeryLazy",
				branch = "legacy",
				enabled = false,
				opts = {
					text = {
						spinner = "dots",
						done = "󰸞 ",
					},
					window = {
						blend = 0,
					},
				},
			},
			{ "geril2207/lsp_signature.nvim", dev = false },
			"b0o/schemastore.nvim",
		},
	},
}

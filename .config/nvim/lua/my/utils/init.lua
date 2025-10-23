local M = {}

M.is_fvim = vim.g.fvim_loaded
M.is_goneovim = vim.g.goneovim == 1
M.is_nvy = vim.g.nvy
M.is_neovide = vim.g.neovide
M.is_gui = vim.fn.has("gui_running") == 1
M.is_nvim_qt = vim.fn.has("gui_running") == 1
	and not vim.g.neovide
	and not vim.g.fvim_loaded
	and not vim.g.nvy
	and not M.is_goneovim

M.transparent = true -- vim.fn.has("gui_running") == 0

function M.apply_font(opts)
	opts = opts or {}
	if opts.font_family then
		FontFamily = opts.font_family
	end
	if opts.font_size then
		FontSize = opts.font_size
	end

	vim.o.guifont = FontFamily .. ":h" .. FontSize
end

function M.increase_font_size(value)
	M.apply_font({ font_size = FontSize + value })
end

function M.decrease_font_size(value)
	M.apply_font({ font_size = FontSize - value })
end

-- function M.setup_color_scheme(name, lazy)
-- 	if lazy then
-- 		require("themes." .. name)
-- 	end
-- 	vim.cmd("colorscheme " .. name)
--
--  vim.cmd("hi! HarpoonInactive guibg=NONE guifg=#63698c")
-- 	vim.cmd("hi! HarpoonActive guibg=NONE guifg=white")
-- 	vim.cmd("hi! HarpoonNumberActive guibg=NONE guifg=#7aa2f7")
-- 	vim.cmd("hi! HarpoonNumberInactive guibg=NONE guifg=#7aa2f7")
-- 	vim.cmd("hi! TabLineFill guibg=NONE guifg=white")
-- end

function M.exec_time()
	local label
	local start_time
	return {
		---@param new_label string?
		start = function(new_label)
			label = new_label or "EXEC TIME: "
			start_time = os.clock()
		end,
		finish = function()
			print(label .. (os.clock() - start_time) * 1000)
		end,
	}
end

return M

vim.wo.winbar = nil

-- vertical split alt+v
vim.keymap.set("n", "<M-v>", function()
  local curline = vim.api.nvim_get_current_line()
  local working_directory = vim.fn.getcwd() .. "/"
  vim.cmd("vsp " .. working_directory .. curline)
end, { buffer = true, noremap = true, silent = true })

-- horizontal split alt+h
vim.keymap.set("n", "<M-h>", function()
  local curline = vim.api.nvim_get_current_line()
  local working_directory = vim.fn.getcwd() .. "/"
  vim.cmd("sp " .. working_directory .. curline)
end, { buffer = true, noremap = true, silent = true })

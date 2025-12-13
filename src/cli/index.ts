#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'

const program = new Command()

program
  .name('todo-visual-thinker')
  .description('Neuroscience-backed todo list for visual thinkers')
  .version('0.1.0')

program
  .command('list')
  .description('List all todos')
  .action(() => {
    console.log(chalk.blue('📋 Todo list (coming soon)'))
  })

program
  .command('add <task>')
  .description('Add a new todo')
  .action((task: string) => {
    console.log(chalk.green(`✅ Added: ${task}`))
  })

program.parse()

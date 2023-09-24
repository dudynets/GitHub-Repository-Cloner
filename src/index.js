import axios from 'axios';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import gitClone from 'git-clone';
import chalk from 'chalk';

// Function to prompt for user or organization and GitHub username
async function getUserInput() {
  const userInput = await inquirer.prompt([
    {
      type: 'list',
      name: 'entity',
      message: 'Clone repositories for a user or organization?',
      choices: ['User', 'Organization'],
    },
    {
      type: 'input',
      name: 'username',
      message: 'Enter the GitHub username:',
    },
  ]);

  console.log(
    chalk.yellow(
      `\nCloning ${userInput.entity.toLowerCase()} repositories for ${
        userInput.username
      }...`,
    ),
  );

  return userInput;
}

// Function to fetch and clone repositories
async function cloneRepositories(entity, username) {
  try {
    const response = await axios.get(
      `https://api.github.com/${entity.toLowerCase()}s/${username}/repos`,
    );

    const repositories = response.data;
    const outputFolder = `dumps/${entity.toLowerCase()}_${username}`;

    // Delete the folder if it already exists
    await fs.remove(outputFolder);

    // Create the folder
    await fs.mkdirp(outputFolder);

    // Clone repositories with progress
    for (const repo of repositories) {
      const repoUrl = repo.clone_url;
      const repoName = repo.name;
      console.log(`\n${chalk.yellow('ℹ')} Cloning ${chalk.blue(repoName)}...`);

      // Use git-clone to clone the repository
      await new Promise((resolve, reject) => {
        gitClone(repoUrl, `${outputFolder}/${repoName}`, {}, (err) => {
          if (err) {
            console.error(
              chalk.red(`ℹ Error cloning ${repoName}: ${err.message}`),
            );
            reject(err);
          } else {
            console.log(`${chalk.green('✔')} Cloned ${chalk.blue(repoName)}`);
            resolve();
          }
        });
      });
    }

    console.log('\n', chalk.green('✔ All repositories cloned successfully.'));
  } catch (error) {
    console.error('\n', chalk.red('ℹ An error occurred:'), error);
  }
}

// Main function
async function main() {
  console.log(chalk.yellow('GitHub Repository Cloner'), '\n');

  const userInput = await getUserInput();
  const {entity, username} = userInput;

  await cloneRepositories(entity, username);
}

main();

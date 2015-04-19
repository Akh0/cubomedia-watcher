'use strict';
module.exports = function (grunt) {
    // Show elapsed time at the end
    require('time-grunt')(grunt);
    // Load all grunt tasks
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            gruntfile: {
                src: ['Gruntfile.js']
            },
            js: {
                src: ['*.js']
            },
            test: {
                src: ['test/**/*.js']
            }
        },
        mochacli: {
            options: {
                reporter: 'nyan',
                bail: true
            },
            all: ['test/*.js']
        },
        watch: {
            gruntfile: {
                files: '<%= jshint.gruntfile.src %>',
                tasks: ['jshint:gruntfile']
            },
            js: {
                files: '<%= jshint.js.src %>',
                tasks: ['jshint:js', 'mochacli']
            },
            test: {
                files: '<%= jshint.test.src %>',
                tasks: ['jshint:test', 'mochacli']
            }
        },
        rsync: {
            options: {
                args: ["--verbose"],
                exclude: [".git*",".idea","node_modules"],
                recursive: true
            },
            prod: {
                options: {
                    src: ".",
                    dest: "~/node-cli/cubomedia-watcher/",
                    host: "akh@cuborama.net",
                    delete: true // Careful this option could cause data loss, read the docs!
                }
            }
        }
    });

    grunt.registerTask('default', ['jshint', 'mochacli']);
};

const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');

gulp.task('scripts', function () {
  return tsProject.src()
    .pipe(tsProject())
    .pipe(gulp.dest('dist'));
});

gulp.task('copy-views', function () {
  return gulp.src('src/views/**/*')
    .pipe(gulp.dest('dist/views'));
});

gulp.task('default', gulp.series('scripts', 'copy-views'));
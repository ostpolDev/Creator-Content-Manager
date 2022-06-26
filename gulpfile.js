const gulp = require('gulp');
const cleanCss = require('gulp-clean-css');

gulp.task("minify-css", () => {
    return gulp.src("demo/styles.css")
    .pipe(cleanCss({compatibility: "ie8"}))
    .pipe(gulp.dest("public/css"))
})

gulp.task("minify-dark-css", () => {
    return gulp.src("demo/styles.dark.css")
    .pipe(cleanCss({compatibility: "ie8"}))
    .pipe(gulp.dest("public/css"))
})

gulp.task("minify-auto-css", () => {
    return gulp.src("demo/styles.auto.css")
    .pipe(cleanCss({compatibility: "ie8"}))
    .pipe(gulp.dest("public/css"))
})

exports.default = gulp.series("minify-css", "minify-dark-css", "minify-auto-css");
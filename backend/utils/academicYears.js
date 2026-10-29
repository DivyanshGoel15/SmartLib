const academicYears = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const isAcademicYear = value => academicYears.includes(value);
const getAcademicYearRank = value => academicYears.indexOf(value) + 1;

module.exports = {
  academicYears,
  isAcademicYear,
  getAcademicYearRank
};

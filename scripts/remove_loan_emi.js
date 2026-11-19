const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const payslips = await prisma.payslip.findMany();
  let updated = 0;
  for (const ps of payslips) {
    const deductions = ps.deductions; // assume stored as JSON array
    if (!Array.isArray(deductions)) continue;
    const filtered = deductions.filter(d => d.name !== 'Loan EMI');
    if (filtered.length === deductions.length) continue;
    const totalDeduction = filtered.reduce((sum, d) => sum + (d.amount || 0), 0);
    const netPay = (ps.grossPay || 0) - totalDeduction;
    await prisma.payslip.update({
      where: { id: ps.id },
      data: {
        deductions: filtered,
        totalDeduction,
        netPay,
      },
    });
    updated++;
  }
  console.log(`Updated ${updated} payslips`);
}

main()
  .catch(e => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

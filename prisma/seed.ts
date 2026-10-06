import { PrismaClient, Sex } from '../generated/prisma';

const prisma = new PrismaClient();

// Синтетические данные для legacy random-веток (DAG/DAI/DAK, DAC/DAD/DCS).
// BFF base-input flow на них не опирается; нужны только старым public endpoint'ам.
const addresses = [
  { DAG: '1200 MAIN ST', DAI: 'LITTLE ROCK', DAK: '72201', DAJ: 'AR' },
  { DAG: '55 OAK AVE', DAI: 'FAYETTEVILLE', DAK: '72701', DAJ: 'AR' },
  { DAG: '410 PINE ST', DAI: 'SACRAMENTO', DAK: '95814', DAJ: 'CA' },
  { DAG: '980 MARKET ST', DAI: 'SAN FRANCISCO', DAK: '94103', DAJ: 'CA' },
  { DAG: '77 BROADWAY', DAI: 'NEW YORK', DAK: '10007', DAJ: 'NY' },
  { DAG: '300 ELM ST', DAI: 'BUFFALO', DAK: '14202', DAJ: 'NY' },
  { DAG: '500 CONGRESS AVE', DAI: 'AUSTIN', DAK: '78701', DAJ: 'TX' },
  { DAG: '1500 COMMERCE ST', DAI: 'DALLAS', DAK: '75201', DAJ: 'TX' },
];

const names = [
  { DAC: 'JOHN', DAD: 'MICHAEL', DCS: 'SMITH', DBC: Sex.M },
  { DAC: 'JAMES', DAD: 'ROBERT', DCS: 'JOHNSON', DBC: Sex.M },
  { DAC: 'DAVID', DAD: 'WILLIAM', DCS: 'BROWN', DBC: Sex.M },
  { DAC: 'MARY', DAD: 'ANN', DCS: 'JONES', DBC: Sex.F },
  { DAC: 'JENNIFER', DAD: 'MARIE', DCS: 'GARCIA', DBC: Sex.F },
  { DAC: 'LINDA', DAD: 'LEE', DCS: 'MILLER', DBC: Sex.F },
];

async function main(): Promise<void> {
  await prisma.address.deleteMany();
  await prisma.names.deleteMany();
  await prisma.address.createMany({ data: addresses });
  await prisma.names.createMany({ data: names });
  console.log(
    `Seed done: addresses=${addresses.length}, names=${names.length}`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

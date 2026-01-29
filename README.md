admin credentials
email: admin@sobol.com
password: 123

create admin:
npx ts-node scripts/createManager.ts

common commands
npx prisma migrate reset

run frontend:
cd frontend
npm run dev

run backend:
cd backend
npm run dev

run database:
cd backend
npx prisma studio (editor)
npx prisma dev

-----------------
features to implement

Schedule (admin/manager)
- drag to create schedule

Schedule (user/employee)
- toggle between only me vs everyone

Account
- add email/number
- notifications for schedule updates
- manager: add new users 

Login
- id (last 4 digit of number) and password 
- default password is SobolPlainview -> reset after logging in 

---- data types ----
schedule object frontend
- startTime, endTime saved as string in [date]T[time] format

unavailability rule object frontend
- startDate, endDate saved as string "YYYY-MM-DD"
- startTime, endTime saved as string in military time 00:00-23:59

convert rules to EventInput
- start, end in [date]T[time] format (use combineDateAndTime function)
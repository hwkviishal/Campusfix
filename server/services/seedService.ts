import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus } from '../models/Complaint.js';

export interface SeedCredential {
  name: string;
  email: string;
  password: string;
  role: 'STUDENT' | 'TECHNICIAN' | 'ADMIN';
  departmentName?: string;
  phone?: string;
}

export const SEED_CREDENTIALS: SeedCredential[] = [
  // 1 ADMIN
  {
    name: 'Dr. Arthur Vance (Chief Facilities Director)',
    email: 'admin@campusfix.edu',
    password: 'Admin@123',
    role: 'ADMIN',
    departmentName: 'Campus Facilities & Operations',
    phone: '+1 (555) 019-2831',
  },
  // 5 TECHNICIANS
  {
    name: 'Marcus Vance (Lead Electrician)',
    email: 'tech.electric@campusfix.edu',
    password: 'Tech@123',
    role: 'TECHNICIAN',
    departmentName: 'Electrical Maintenance',
    phone: '+1 (555) 019-3344',
  },
  {
    name: 'Elena Rostova (Master Plumber & HVAC)',
    email: 'tech.plumb@campusfix.edu',
    password: 'Tech@123',
    role: 'TECHNICIAN',
    departmentName: 'Plumbing & Water Systems',
    phone: '+1 (555) 019-5566',
  },
  {
    name: 'James Chen (Senior Network & IT Specialist)',
    email: 'tech.net@campusfix.edu',
    password: 'Tech@123',
    role: 'TECHNICIAN',
    departmentName: 'IT & Network Infrastructure',
    phone: '+1 (555) 019-8822',
  },
  {
    name: 'Priya Nair (Facilities & Furniture Specialist)',
    email: 'tech.facil@campusfix.edu',
    password: 'Tech@123',
    role: 'TECHNICIAN',
    departmentName: 'Campus Facilities & Operations',
    phone: '+1 (555) 019-4411',
  },
  {
    name: 'Carlos Morales (Head of Housekeeping & Sanitation)',
    email: 'tech.house@campusfix.edu',
    password: 'Tech@123',
    role: 'TECHNICIAN',
    departmentName: 'General Housekeeping',
    phone: '+1 (555) 019-9933',
  },
  // 10 STUDENTS
  {
    name: 'Vishal Singh (CS Sophomore)',
    email: 'student1@campusfix.edu',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+1 (555) 019-7711',
  },
  {
    name: 'Chloe Bennett (Mechanical Junior)',
    email: 'student2@campusfix.edu',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+1 (555) 019-7722',
  },
  {
    name: 'Rahul Sharma (Civil Engineering Senior)',
    email: 'student3@campusfix.edu',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+1 (555) 019-7733',
  },
  {
    name: 'Aisha Patel (Bioengineering Freshman)',
    email: 'student4@campusfix.edu',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+1 (555) 019-7744',
  },
  {
    name: 'David Kim (Architecture Sophomore)',
    email: 'student5@campusfix.edu',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+1 (555) 019-7755',
  },
  {
    name: 'Maya Lin (Data Science Junior)',
    email: 'student6@campusfix.edu',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+1 (555) 019-7766',
  },
  {
    name: 'Lucas Rossi (Physics Freshman)',
    email: 'student7@campusfix.edu',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+1 (555) 019-7777',
  },
  {
    name: 'Samantha Hayes (Chemistry Senior)',
    email: 'student8@campusfix.edu',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+1 (555) 019-7788',
  },
  {
    name: 'Tariq Al-Mansoor (Electrical Engineering Junior)',
    email: 'student9@campusfix.edu',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+1 (555) 019-7799',
  },
  {
    name: 'Zoe Washington (Environmental Studies Sophomore)',
    email: 'student10@campusfix.edu',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+1 (555) 019-7700',
  },
];

export async function seedInitialData(forceReseed = false): Promise<void> {
  try {
    console.log('[SeedService] Verifying departments and users...');

    // 1. Create or ensure Default Departments
    const departmentsData = [
      {
        name: 'Electrical Maintenance',
        code: 'ELEC',
        contactEmail: 'elec.help@campusfix.edu',
        description: 'Power lines, transformers, lab wiring, classroom lighting, and HVAC electrical circuits',
      },
      {
        name: 'Plumbing & Water Systems',
        code: 'PLUMB',
        contactEmail: 'water.help@campusfix.edu',
        description: 'Restroom fixtures, overhead leaks, drainage, main pipelines, and drinking fountains',
      },
      {
        name: 'IT & Network Infrastructure',
        code: 'IT-NET',
        contactEmail: 'netops@campusfix.edu',
        description: 'Campus routers, Wi-Fi access points, fiber conduits, and ethernet ports',
      },
      {
        name: 'Campus Facilities & Operations',
        code: 'FACIL',
        contactEmail: 'facilities@campusfix.edu',
        description: 'Structural maintenance, roofs, classrooms, windows, furniture, and building locks',
      },
      {
        name: 'General Housekeeping',
        code: 'HOUSE',
        contactEmail: 'cleaning@campusfix.edu',
        description: 'Sanitation, debris clearing, cafeteria maintenance, and spill emergency response',
      },
    ];

    const departmentMap = new Map<string, any>();
    for (const dep of departmentsData) {
      const createdDep = await Department.findOneAndUpdate(
        { code: dep.code },
        dep,
        { upsert: true, new: true }
      );
      departmentMap.set(dep.name, createdDep._id);
    }

    // 2. Ensure all 16 Users exist (1 Admin, 5 Technicians, 10 Students)
    for (const cred of SEED_CREDENTIALS) {
      const existingUser = await User.findOne({ email: cred.email });
      const depId = cred.departmentName ? departmentMap.get(cred.departmentName) : undefined;

      if (!existingUser) {
        const user = new User({
          name: cred.name,
          email: cred.email,
          password: cred.password, // Pre-save hook will hash with bcrypt
          role: cred.role,
          phone: cred.phone,
          department: depId,
          isActive: true,
        });
        await user.save();
      } else {
        // Ensure department and active status are correctly set
        let modified = false;
        if (depId && (!existingUser.department || existingUser.department.toString() !== depId.toString())) {
          existingUser.department = depId;
          modified = true;
        }
        if (!existingUser.isActive) {
          existingUser.isActive = true;
          modified = true;
        }
        if (modified) {
          await existingUser.save();
        }
      }
    }

    console.log('[SeedService] Users verified (1 Admin, 5 Technicians, 10 Students).');

    // 3. Seed Realistic Complaints (Aim for 30+ complaints with realistic states and assignments)
    const complaintCount = await Complaint.countDocuments();
    if (complaintCount < 30 || forceReseed) {
      if (forceReseed) {
        console.log('[SeedService] Reseeding all complaints...');
        await Complaint.deleteMany({});
      } else {
        console.log(`[SeedService] Existing complaint count (${complaintCount}) < 30. Seeding full dataset...`);
      }

      // Fetch users for relational mapping
      const admin = await User.findOne({ email: 'admin@campusfix.edu' });
      const techElec = await User.findOne({ email: 'tech.electric@campusfix.edu' });
      const techPlumb = await User.findOne({ email: 'tech.plumb@campusfix.edu' });
      const techNet = await User.findOne({ email: 'tech.net@campusfix.edu' });
      const techFacil = await User.findOne({ email: 'tech.facil@campusfix.edu' });
      const techHouse = await User.findOne({ email: 'tech.house@campusfix.edu' });

      const students = await User.find({ role: 'STUDENT' }).sort({ email: 1 });

      const elecDept = await Department.findOne({ code: 'ELEC' });
      const plumbDept = await Department.findOne({ code: 'PLUMB' });
      const netDept = await Department.findOne({ code: 'IT-NET' });
      const facilDept = await Department.findOne({ code: 'FACIL' });
      const houseDept = await Department.findOne({ code: 'HOUSE' });

      if (!admin || !techElec || !techPlumb || !techNet || !techFacil || !techHouse || students.length < 5) {
        console.error('[SeedService] Missing required users for seeding complaints.');
        return;
      }

      const adminId = admin._id;
      const s = students.map((user) => user._id);

      const rawComplaints: Array<{
        title: string;
        description: string;
        category: ComplaintCategory;
        priority: ComplaintPriority;
        status: ComplaintStatus;
        building: string;
        floor: string;
        room: string;
        reportedBy: any;
        assignedTo?: any;
        assignedAt?: Date;
        department?: any;
        resolutionNotes?: string;
        resolvedAt?: Date;
        statusHistory: Array<{
          status: ComplaintStatus;
          changedBy: any;
          timestamp: Date;
          comment?: string;
        }>;
      }> = [
        // --- UNASSIGNED / OPEN COMPLAINTS (10 tickets) ---
        {
          title: 'Ceiling fan vibrating and making grinding noise',
          description: 'The ceiling fan in Lecture Room 203 has an unstable mount and makes loud friction noise above 50% speed, disrupting classes.',
          category: 'ELECTRICAL',
          priority: 'MEDIUM',
          status: 'OPEN',
          building: 'Academic Block A',
          floor: '2',
          room: 'Room 203',
          reportedBy: s[0],
          department: elecDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[0], timestamp: new Date(Date.now() - 3600000 * 3), comment: 'Reported by student' },
          ],
        },
        {
          title: 'Flickering fluorescent lights near presentation screen',
          description: 'Two fluorescent tubes at the front of the physics auditorium flicker uncontrollably, causing severe glare during lectures.',
          category: 'ELECTRICAL',
          priority: 'LOW',
          status: 'OPEN',
          building: 'Science Complex',
          floor: '1',
          room: 'Auditorium 101',
          reportedBy: s[1],
          department: elecDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[1], timestamp: new Date(Date.now() - 3600000 * 5), comment: 'Reported by student' },
          ],
        },
        {
          title: 'Main pipeline leak causing standing water in basement lab',
          description: 'Urgent: Water is spewing from a pressure relief valve in the civil engineering soil lab. Water is reaching electrical panels.',
          category: 'PLUMBING',
          priority: 'CRITICAL',
          status: 'OPEN',
          building: 'Engineering Tower',
          floor: 'Basement',
          room: 'Soil Testing Lab B-12',
          reportedBy: s[2],
          department: plumbDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[2], timestamp: new Date(Date.now() - 3600000 * 1), comment: 'Emergency hazard reported by student' },
          ],
        },
        {
          title: 'Low water pressure on upper floors of Residential Block A',
          description: 'Showers and washbasin taps on the 4th floor have had zero water pressure since morning.',
          category: 'PLUMBING',
          priority: 'HIGH',
          status: 'OPEN',
          building: 'North Residential Hall',
          floor: '4',
          room: 'Wing Restrooms',
          reportedBy: s[3],
          department: plumbDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[3], timestamp: new Date(Date.now() - 3600000 * 8), comment: 'Reported by resident' },
          ],
        },
        {
          title: 'Wi-Fi completely offline in Central Library Study Hall 2',
          description: 'Students preparing for midterm exams cannot connect to the eduroam or CampusFix-Guest Wi-Fi networks in hall 2.',
          category: 'INTERNET_WIFI',
          priority: 'HIGH',
          status: 'OPEN',
          building: 'Central Library',
          floor: '2',
          room: 'Study Hall 2B',
          reportedBy: s[4],
          department: netDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[4], timestamp: new Date(Date.now() - 3600000 * 2), comment: 'High student traffic area without internet' },
          ],
        },
        {
          title: 'Ethernet wall drop RJ-45 jack broken in AI Research Lab',
          description: 'The physical network socket on wall terminal 14 has bent pins and does not secure Ethernet cables.',
          category: 'INTERNET_WIFI',
          priority: 'LOW',
          status: 'OPEN',
          building: 'Technology Center',
          floor: '3',
          room: 'AI Research Lab 310',
          reportedBy: s[5],
          department: netDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[5], timestamp: new Date(Date.now() - 3600000 * 14), comment: 'Reported' },
          ],
        },
        {
          title: 'Coffee spill and sticky residue on study desks',
          description: 'Large beverage spill has dried on several communal study desks and carpet near the 1st floor reading pod.',
          category: 'CLEANING',
          priority: 'LOW',
          status: 'OPEN',
          building: 'Central Library',
          floor: '1',
          room: 'Reading Pod West',
          reportedBy: s[6],
          department: houseDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[6], timestamp: new Date(Date.now() - 3600000 * 6), comment: 'Request for sanitation crew' },
          ],
        },
        {
          title: 'Broken desk hinge and splintered armrest in Lecture Hall',
          description: 'Row 4 seat 3 has a fractured folding table arm that cannot be locked in place for writing.',
          category: 'FURNITURE',
          priority: 'MEDIUM',
          status: 'OPEN',
          building: 'Academic Block B',
          floor: '1',
          room: 'Hall 115',
          reportedBy: s[7],
          department: facilDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[7], timestamp: new Date(Date.now() - 3600000 * 12), comment: 'Reported' },
          ],
        },
        {
          title: 'Broken window latch allowing cold draft into dormitory',
          description: 'The casement window latch is stripped, leaving a 2-inch gap during windy conditions.',
          category: 'HOSTEL',
          priority: 'MEDIUM',
          status: 'OPEN',
          building: 'South Residential Hall',
          floor: '2',
          room: 'Room 214',
          reportedBy: s[8],
          department: facilDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[8], timestamp: new Date(Date.now() - 3600000 * 16), comment: 'Reported' },
          ],
        },
        {
          title: 'Perimeter pathway lighting pitch dark near Sports Complex',
          description: 'Outdoor streetlamps 4, 5, and 6 along the pedestrian path are dark, posing safety concerns for evening students.',
          category: 'SECURITY',
          priority: 'CRITICAL',
          status: 'OPEN',
          building: 'Sports Complex',
          floor: 'Ground',
          room: 'East Perimeter Walkway',
          reportedBy: s[9],
          department: elecDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[9], timestamp: new Date(Date.now() - 3600000 * 2), comment: 'Urgent security hazard' },
          ],
        },

        // --- ASSIGNED COMPLAINTS (8 tickets) ---
        {
          title: 'Air conditioning thermostat unresponsive in server room',
          description: 'Server room ambient temperature is rising to 28°C. Thermostat controls are locked and non-responsive.',
          category: 'ELECTRICAL',
          priority: 'CRITICAL',
          status: 'ASSIGNED',
          building: 'Technology Center',
          floor: 'Basement',
          room: 'Data Center Rack Rm',
          reportedBy: s[0],
          assignedTo: techElec._id,
          assignedAt: new Date(Date.now() - 3600000 * 2),
          department: elecDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[0], timestamp: new Date(Date.now() - 3600000 * 4), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 2), comment: 'Dispatched Marcus Vance for immediate thermal inspection' },
          ],
        },
        {
          title: 'Clogged washbasin drain in chemistry faculty lounge',
          description: 'Water drains extremely slowly and gives off sulfur odor when tap is turned on.',
          category: 'PLUMBING',
          priority: 'MEDIUM',
          status: 'ASSIGNED',
          building: 'Science Complex',
          floor: '3',
          room: 'Faculty Lounge 305',
          reportedBy: s[1],
          assignedTo: techPlumb._id,
          assignedAt: new Date(Date.now() - 3600000 * 3),
          department: plumbDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[1], timestamp: new Date(Date.now() - 3600000 * 6), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 3), comment: 'Assigned to Elena Rostova' },
          ],
        },
        {
          title: 'Wi-Fi access point dropping connection periodically',
          description: 'The wireless access point in the study lounge disconnects every 10-15 minutes with high packet loss during peak study hours.',
          category: 'INTERNET_WIFI',
          priority: 'HIGH',
          status: 'ASSIGNED',
          building: 'Library & Media Center',
          floor: '3',
          room: 'Study Lounge 302',
          reportedBy: s[2],
          assignedTo: techNet._id,
          assignedAt: new Date(Date.now() - 3600000 * 5),
          department: netDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[2], timestamp: new Date(Date.now() - 3600000 * 12), comment: 'Submitted by student' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 5), comment: 'Assigned to James Chen for signal testing' },
          ],
        },
        {
          title: 'Loose wooden floorboard tripping hazard near main elevator',
          description: 'Oak plank near the second floor elevator is lifted by half an inch, causing pedestrians to stumble.',
          category: 'FURNITURE',
          priority: 'HIGH',
          status: 'ASSIGNED',
          building: 'Academic Block A',
          floor: '2',
          room: 'Elevator Lobby',
          reportedBy: s[3],
          assignedTo: techFacil._id,
          assignedAt: new Date(Date.now() - 3600000 * 4),
          department: facilDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[3], timestamp: new Date(Date.now() - 3600000 * 10), comment: 'Tripping hazard reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 4), comment: 'Assigned to Priya Nair for fastening' },
          ],
        },
        {
          title: 'Overflowing recycle bins in cafeteria common area',
          description: 'Cardboard boxes and plastic containers piling up outside the cafeteria waste station.',
          category: 'CLEANING',
          priority: 'MEDIUM',
          status: 'ASSIGNED',
          building: 'Student Union',
          floor: '1',
          room: 'Cafeteria South Wing',
          reportedBy: s[4],
          assignedTo: techHouse._id,
          assignedAt: new Date(Date.now() - 3600000 * 2),
          department: houseDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[4], timestamp: new Date(Date.now() - 3600000 * 5), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 2), comment: 'Assigned to Carlos Morales' },
          ],
        },
        {
          title: 'Lab power socket sparking when oscilloscope plugged in',
          description: 'Bench outlet 4 emitted visible sparks and a burnt plastic smell when test equipment was powered on.',
          category: 'ELECTRICAL',
          priority: 'CRITICAL',
          status: 'ASSIGNED',
          building: 'Engineering Tower',
          floor: '3',
          room: 'Circuits Lab 304',
          reportedBy: s[5],
          assignedTo: techElec._id,
          assignedAt: new Date(Date.now() - 3600000 * 1),
          department: elecDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[5], timestamp: new Date(Date.now() - 3600000 * 2), comment: 'Emergency report' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 1), comment: 'Assigned to Marcus Vance' },
          ],
        },
        {
          title: 'Urinal flush valve stuck on continuous flushing',
          description: 'Automatic sensor flush valve in 2nd floor men’s room fails to shut off, continuously running clean water.',
          category: 'PLUMBING',
          priority: 'MEDIUM',
          status: 'ASSIGNED',
          building: 'Academic Block B',
          floor: '2',
          room: 'Men Restroom 210',
          reportedBy: s[6],
          assignedTo: techPlumb._id,
          assignedAt: new Date(Date.now() - 3600000 * 6),
          department: plumbDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[6], timestamp: new Date(Date.now() - 3600000 * 14), comment: 'Water wastage reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 6), comment: 'Assigned to Elena Rostova' },
          ],
        },
        {
          title: 'Door closer hydraulic oil leaking in lecture hall exit',
          description: 'Overhead arm closer is leaking viscous dark oil onto the floor and door slams violently shut.',
          category: 'CLASSROOM_EQUIPMENT',
          priority: 'LOW',
          status: 'ASSIGNED',
          building: 'Science Complex',
          floor: '1',
          room: 'Auditorium 104',
          reportedBy: s[7],
          assignedTo: techFacil._id,
          assignedAt: new Date(Date.now() - 3600000 * 7),
          department: facilDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[7], timestamp: new Date(Date.now() - 3600000 * 18), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 7), comment: 'Assigned to Priya Nair' },
          ],
        },

        // --- IN PROGRESS COMPLAINTS (8 tickets) ---
        {
          title: 'Water pipe leaking beneath washroom sink',
          description: 'Constant dripping water under basin 2 in the 1st floor corridor washroom causing water pooling on tiles.',
          category: 'PLUMBING',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          building: 'Hostel Block C',
          floor: '1',
          room: 'Restroom 104',
          reportedBy: s[0],
          assignedTo: techPlumb._id,
          assignedAt: new Date(Date.now() - 3600000 * 24),
          department: plumbDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[0], timestamp: new Date(Date.now() - 3600000 * 48), comment: 'Reported by student' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 24), comment: 'Assigned to Elena Rostova' },
            { status: 'IN_PROGRESS', changedBy: techPlumb._id, timestamp: new Date(Date.now() - 3600000 * 4), comment: 'Technician started working on the issue' },
          ],
        },
        {
          title: 'Emergency exit stairway light fixture broken',
          description: 'Staircase lighting fixture is shattered and bulbs are exposed on the east fire escape.',
          category: 'SECURITY',
          priority: 'CRITICAL',
          status: 'IN_PROGRESS',
          building: 'Engineering Tower',
          floor: '5',
          room: 'Stairwell East',
          reportedBy: s[2],
          assignedTo: techElec._id,
          assignedAt: new Date(Date.now() - 3600000 * 12),
          department: elecDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[2], timestamp: new Date(Date.now() - 3600000 * 16), comment: 'Reported safety hazard' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 12), comment: 'Assigned to Marcus Vance' },
            { status: 'IN_PROGRESS', changedBy: techElec._id, timestamp: new Date(Date.now() - 3600000 * 2), comment: 'Technician started working on the issue' },
          ],
        },
        {
          title: 'VLAN routing failure on campus dormitory switches',
          description: 'Residents on floors 3 and 4 cannot obtain DHCP lease on the internal student network.',
          category: 'INTERNET_WIFI',
          priority: 'CRITICAL',
          status: 'IN_PROGRESS',
          building: 'North Residential Hall',
          floor: '3',
          room: 'Network Closet 3A',
          reportedBy: s[3],
          assignedTo: techNet._id,
          assignedAt: new Date(Date.now() - 3600000 * 8),
          department: netDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[3], timestamp: new Date(Date.now() - 3600000 * 12), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 8), comment: 'Assigned to James Chen' },
            { status: 'IN_PROGRESS', changedBy: techNet._id, timestamp: new Date(Date.now() - 3600000 * 3), comment: 'Technician started working on the issue' },
          ],
        },
        {
          title: 'Broken whiteboard roller mechanism in seminar room',
          description: 'Double-tier sliding whiteboard counterweight cable snapped, leaving the top board jammed halfway down.',
          category: 'CLASSROOM_EQUIPMENT',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          building: 'Academic Block A',
          floor: '3',
          room: 'Seminar Rm 308',
          reportedBy: s[4],
          assignedTo: techFacil._id,
          assignedAt: new Date(Date.now() - 3600000 * 20),
          department: facilDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[4], timestamp: new Date(Date.now() - 3600000 * 26), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 20), comment: 'Assigned to Priya Nair' },
            { status: 'IN_PROGRESS', changedBy: techFacil._id, timestamp: new Date(Date.now() - 3600000 * 5), comment: 'Technician started working on the issue' },
          ],
        },
        {
          title: 'Severe water leak in ceiling above chemistry storage cabinet',
          description: 'Water drips through mineral tiles onto acid reagent containers. Urgent containment required.',
          category: 'PLUMBING',
          priority: 'CRITICAL',
          status: 'IN_PROGRESS',
          building: 'Science Complex',
          floor: '2',
          room: 'Reagent Prep Lab 215',
          reportedBy: s[5],
          assignedTo: techPlumb._id,
          assignedAt: new Date(Date.now() - 3600000 * 4),
          department: plumbDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[5], timestamp: new Date(Date.now() - 3600000 * 6), comment: 'Chemical safety priority' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 4), comment: 'Assigned to Elena Rostova' },
            { status: 'IN_PROGRESS', changedBy: techPlumb._id, timestamp: new Date(Date.now() - 3600000 * 1), comment: 'Technician started working on the issue' },
          ],
        },
        {
          title: 'Campus shuttle bus #3 seatbelt mechanism jammed',
          description: 'Passenger seat 7 on the campus loop transit bus has a stuck retractor reel and will not latch.',
          category: 'TRANSPORT',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          building: 'Transport Terminal',
          floor: 'Ground',
          room: 'Bay 3',
          reportedBy: s[6],
          assignedTo: techFacil._id,
          assignedAt: new Date(Date.now() - 3600000 * 18),
          department: facilDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[6], timestamp: new Date(Date.now() - 3600000 * 24), comment: 'Vehicle safety' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 18), comment: 'Assigned to Priya Nair' },
            { status: 'IN_PROGRESS', changedBy: techFacil._id, timestamp: new Date(Date.now() - 3600000 * 4), comment: 'Technician started working on the issue' },
          ],
        },
        {
          title: 'Sanitizer dispenser leaking alcohol gel onto marble floor',
          description: 'Automatic hand sanitizer unit in main atrium is dripping gel directly onto the glossy marble floor.',
          category: 'CLEANING',
          priority: 'LOW',
          status: 'IN_PROGRESS',
          building: 'Student Union',
          floor: 'Ground',
          room: 'Main Atrium Entry',
          reportedBy: s[7],
          assignedTo: techHouse._id,
          assignedAt: new Date(Date.now() - 3600000 * 9),
          department: houseDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[7], timestamp: new Date(Date.now() - 3600000 * 15), comment: 'Slip hazard reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 9), comment: 'Assigned to Carlos Morales' },
            { status: 'IN_PROGRESS', changedBy: techHouse._id, timestamp: new Date(Date.now() - 3600000 * 2), comment: 'Technician started working on the issue' },
          ],
        },
        {
          title: 'Circuit breaker tripping repeatedly in robotics workspace',
          description: 'Breaker panel 3A trips whenever 3D printers and CNC router operate simultaneously.',
          category: 'ELECTRICAL',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          building: 'Engineering Tower',
          floor: '1',
          room: 'Robotics Workshop 102',
          reportedBy: s[8],
          assignedTo: techElec._id,
          assignedAt: new Date(Date.now() - 3600000 * 14),
          department: elecDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[8], timestamp: new Date(Date.now() - 3600000 * 20), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 14), comment: 'Assigned to Marcus Vance' },
            { status: 'IN_PROGRESS', changedBy: techElec._id, timestamp: new Date(Date.now() - 3600000 * 3), comment: 'Technician started working on the issue' },
          ],
        },

        // --- RESOLVED COMPLAINTS (6 tickets) ---
        {
          title: 'Air conditioner blowing warm ambient air in CS lab',
          description: 'Ductless split unit in CS lab 218 is blowing ambient air instead of cooling down the room.',
          category: 'ELECTRICAL',
          priority: 'HIGH',
          status: 'RESOLVED',
          building: 'Computer Science Lab',
          floor: '2',
          room: 'Lab 218',
          reportedBy: s[0],
          assignedTo: techElec._id,
          assignedAt: new Date(Date.now() - 3600000 * 48),
          resolvedAt: new Date(Date.now() - 3600000 * 6),
          resolutionNotes: 'Inspected refrigerant levels and condenser coils. Replaced blown capacitor and refilled R-410A refrigerant. Thermal probe verified cooling down to 19°C.',
          department: elecDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[0], timestamp: new Date(Date.now() - 3600000 * 72), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 48), comment: 'Assigned to Marcus Vance' },
            { status: 'IN_PROGRESS', changedBy: techElec._id, timestamp: new Date(Date.now() - 3600000 * 24), comment: 'Technician started working on the issue' },
            { status: 'RESOLVED', changedBy: techElec._id, timestamp: new Date(Date.now() - 3600000 * 6), comment: 'Issue resolved: Replaced blown capacitor and refilled R-410A refrigerant.' },
          ],
        },
        {
          title: 'Sink tap leaking continuously in architecture studio',
          description: 'Compression valve in studio sink had worn seal, dripping approximately 2 liters per hour.',
          category: 'PLUMBING',
          priority: 'MEDIUM',
          status: 'RESOLVED',
          building: 'Architecture Studio',
          floor: '3',
          room: 'Wash Station 301',
          reportedBy: s[4],
          assignedTo: techPlumb._id,
          assignedAt: new Date(Date.now() - 3600000 * 36),
          resolvedAt: new Date(Date.now() - 3600000 * 8),
          resolutionNotes: 'Replaced rubber compression washer, re-threaded packing nut, and sealed valve stem with PTFE thread tape.',
          department: plumbDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[4], timestamp: new Date(Date.now() - 3600000 * 50), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 36), comment: 'Assigned to Elena Rostova' },
            { status: 'IN_PROGRESS', changedBy: techPlumb._id, timestamp: new Date(Date.now() - 3600000 * 18), comment: 'Technician started working on the issue' },
            { status: 'RESOLVED', changedBy: techPlumb._id, timestamp: new Date(Date.now() - 3600000 * 8), comment: 'Issue resolved: Replaced washer and sealed valve stem.' },
          ],
        },
        {
          title: 'DNS lookup failures on dormitory student Wi-Fi',
          description: 'Students experiencing intermittent timeout errors when loading university portal and external research sites.',
          category: 'INTERNET_WIFI',
          priority: 'HIGH',
          status: 'RESOLVED',
          building: 'South Residential Hall',
          floor: '1',
          room: 'Router Hub Room',
          reportedBy: s[1],
          assignedTo: techNet._id,
          assignedAt: new Date(Date.now() - 3600000 * 30),
          resolvedAt: new Date(Date.now() - 3600000 * 10),
          resolutionNotes: 'Flushed upstream DNS cache on local BIND forwarder, updated failover resolver to secondary cloud nameservers, and restored sub-10ms query latency.',
          department: netDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[1], timestamp: new Date(Date.now() - 3600000 * 40), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 30), comment: 'Assigned to James Chen' },
            { status: 'IN_PROGRESS', changedBy: techNet._id, timestamp: new Date(Date.now() - 3600000 * 16), comment: 'Technician started working on the issue' },
            { status: 'RESOLVED', changedBy: techNet._id, timestamp: new Date(Date.now() - 3600000 * 10), comment: 'Issue resolved: Flushed DNS cache and updated failover resolvers.' },
          ],
        },
        {
          title: 'Library study cubicle privacy divider loose and wobbling',
          description: 'Acoustic privacy screen between carrels 12 and 13 was detached at bottom metal clamp.',
          category: 'FURNITURE',
          priority: 'LOW',
          status: 'RESOLVED',
          building: 'Central Library',
          floor: '2',
          room: 'Quiet Study Carrel 12',
          reportedBy: s[6],
          assignedTo: techFacil._id,
          assignedAt: new Date(Date.now() - 3600000 * 44),
          resolvedAt: new Date(Date.now() - 3600000 * 12),
          resolutionNotes: 'Installed heavy-duty aluminum bracket with counter-sunk screws. Screen is now rigid and level.',
          department: facilDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[6], timestamp: new Date(Date.now() - 3600000 * 60), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 44), comment: 'Assigned to Priya Nair' },
            { status: 'IN_PROGRESS', changedBy: techFacil._id, timestamp: new Date(Date.now() - 3600000 * 22), comment: 'Technician started working on the issue' },
            { status: 'RESOLVED', changedBy: techFacil._id, timestamp: new Date(Date.now() - 3600000 * 12), comment: 'Issue resolved: Installed heavy-duty aluminum bracket.' },
          ],
        },
        {
          title: 'Graffiti on stall door in 3rd floor humanities restroom',
          description: 'Ink markings and permanent marker graffiti on stall 2 interior partition.',
          category: 'CLEANING',
          priority: 'LOW',
          status: 'RESOLVED',
          building: 'Academic Block B',
          floor: '3',
          room: 'Restroom 302',
          reportedBy: s[8],
          assignedTo: techHouse._id,
          assignedAt: new Date(Date.now() - 3600000 * 28),
          resolvedAt: new Date(Date.now() - 3600000 * 14),
          resolutionNotes: 'Applied citrus graffiti remover solvent and buffed with commercial melamine pad. Cleaned and sanitized door surface.',
          department: houseDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[8], timestamp: new Date(Date.now() - 3600000 * 35), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 28), comment: 'Assigned to Carlos Morales' },
            { status: 'IN_PROGRESS', changedBy: techHouse._id, timestamp: new Date(Date.now() - 3600000 * 19), comment: 'Technician started working on the issue' },
            { status: 'RESOLVED', changedBy: techHouse._id, timestamp: new Date(Date.now() - 3600000 * 14), comment: 'Issue resolved: Applied graffiti solvent and sanitized surface.' },
          ],
        },
        {
          title: 'Projector HDMI wall interface producing magenta color distortion',
          description: 'Classroom projector connected via wall jack showed strong pink artifacts and flicker.',
          category: 'CLASSROOM_EQUIPMENT',
          priority: 'HIGH',
          status: 'RESOLVED',
          building: 'Science Complex',
          floor: '4',
          room: 'Auditorium 410',
          reportedBy: s[0],
          assignedTo: techElec._id,
          assignedAt: new Date(Date.now() - 3600000 * 55),
          resolvedAt: new Date(Date.now() - 3600000 * 15),
          resolutionNotes: 'Inspected HDMI wall barrel connector. Found bent ground pin inside jack. Terminated brand new shielded female-to-female HDMI keystone coupler and verified 4K 60Hz video without artifacts.',
          department: elecDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[0], timestamp: new Date(Date.now() - 3600000 * 80), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 55), comment: 'Assigned to Marcus Vance' },
            { status: 'IN_PROGRESS', changedBy: techElec._id, timestamp: new Date(Date.now() - 3600000 * 30), comment: 'Technician started working on the issue' },
            { status: 'RESOLVED', changedBy: techElec._id, timestamp: new Date(Date.now() - 3600000 * 15), comment: 'Issue resolved: Replaced damaged HDMI wall keystone coupler.' },
          ],
        },

        // --- VERIFIED & CLOSED COMPLAINTS (2 tickets) ---
        {
          title: 'Hydraulic door closer slamming on main library entrance',
          description: 'Heavy glass entrance door swung shut dangerously fast due to loss of backcheck resistance.',
          category: 'SECURITY',
          priority: 'CRITICAL',
          status: 'VERIFIED',
          building: 'Central Library',
          floor: 'Ground',
          room: 'Main Entrance Revolving / Pivot',
          reportedBy: s[2],
          assignedTo: techFacil._id,
          assignedAt: new Date(Date.now() - 3600000 * 90),
          resolvedAt: new Date(Date.now() - 3600000 * 35),
          resolutionNotes: 'Calibrated sweep and latch hydraulic speed valves. Replaced worn cylinder seal and tested 10 opening cycles to ensure gentle 5-second closing action.',
          department: facilDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[2], timestamp: new Date(Date.now() - 3600000 * 110), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 90), comment: 'Assigned' },
            { status: 'IN_PROGRESS', changedBy: techFacil._id, timestamp: new Date(Date.now() - 3600000 * 60), comment: 'Technician started work' },
            { status: 'RESOLVED', changedBy: techFacil._id, timestamp: new Date(Date.now() - 3600000 * 35), comment: 'Hydraulic valves adjusted' },
            { status: 'VERIFIED', changedBy: s[2], timestamp: new Date(Date.now() - 3600000 * 10), comment: 'Tested door and verified smooth closure' },
          ],
        },
        {
          title: 'Burned out spotlight above stage in Main Auditorium',
          description: 'Center spotlight #3 failed before convocation rehearsal.',
          category: 'ELECTRICAL',
          priority: 'LOW',
          status: 'CLOSED',
          building: 'Main Auditorium',
          floor: '2',
          room: 'Stage Gantry',
          reportedBy: s[5],
          assignedTo: techElec._id,
          assignedAt: new Date(Date.now() - 3600000 * 120),
          resolvedAt: new Date(Date.now() - 3600000 * 45),
          resolutionNotes: 'Replaced 500W halogen stage bulb with energy-efficient dimmable LED fixture.',
          department: elecDept?._id,
          statusHistory: [
            { status: 'OPEN', changedBy: s[5], timestamp: new Date(Date.now() - 3600000 * 140), comment: 'Reported' },
            { status: 'ASSIGNED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 120), comment: 'Assigned' },
            { status: 'IN_PROGRESS', changedBy: techElec._id, timestamp: new Date(Date.now() - 3600000 * 80), comment: 'Technician on gantry' },
            { status: 'RESOLVED', changedBy: techElec._id, timestamp: new Date(Date.now() - 3600000 * 45), comment: 'Bulb replaced with LED' },
            { status: 'CLOSED', changedBy: adminId, timestamp: new Date(Date.now() - 3600000 * 20), comment: 'Work order audited and marked closed' },
          ],
        },
      ];

      for (const comp of rawComplaints) {
        const complaintDoc = new Complaint(comp);
        await complaintDoc.save();
      }

      console.log(`[SeedService] Successfully seeded ${rawComplaints.length} complaints (Total in DB now: ${await Complaint.countDocuments()}).`);
    }
  } catch (err: any) {
    console.error('[SeedService] Error during seeding:', err.message);
  }
}

import type {OpenAPIObject} from '@nestjs/swagger';
type Field={type:string;[key:string]:unknown};
const string=(description:string,extra:Record<string,unknown>={}):Field=>({type:'string',description,...extra});
export function describeBodies(doc:OpenAPIObject){
 const email=string('Email tài khoản',{format:'email'}),password=string('Mật khẩu 8–100 ký tự',{minLength:8,maxLength:100}),consent={type:'boolean',enum:[true]},planId=string('Mã gói',{enum:['diamond','master','grandmaster','challenger']});
 const bodies:Record<string,Record<string,Field>>={
  'post /auth/login':{email,password},'post /auth/register':{email,password,displayName:string('Tên hiển thị'),consent},
  'post /auth/password/forgot':{email},'post /auth/password/reset':{token:string('Mã đặt lại mật khẩu một lần'),password},
  'post /demo/login':{account:string('Tài khoản demo',{enum:['diamond','master','grandmaster','challenger','coach-1','coach-2','admin']})},
  'post /payments/checkout-session':{planId,outcome:string('Kịch bản mô phỏng',{enum:['succeeded','failed','cancelled']}),consent,coupon:string('Tùy chọn: SSC10')},
  'post /payments/webhooks/mock':{eventId:string('Mã sự kiện duy nhất'),userId:string('UUID tài khoản'),planId,outcome:string('Trạng thái',{enum:['succeeded','failed','cancelled']})},
  'post /membership/change-plan':{planId},
  'post /vod-reviews':{title:string('Tiêu đề trận đấu'),url:string('Link HTTPS Google Drive chứa file ID'),rank:string('Hạng tại thời điểm gửi'),focus:string('Vấn đề cần tập trung'),notes:string('Ghi chú, tối đa 2000 ký tự'),coachId:string('Coach mong muốn, tùy chọn'),access:string('Kết quả Drive mock',{enum:['accessible','permission_required','not_found']}),consent},
  'post /vod-reviews/{id}/{action}':{access:string('Dùng khi recheck-source',{enum:['accessible','permission_required']})},
  'post /coach/vod-reviews/{id}/{action}':{coachId:string('Coach nhận phân công'),summary:string('Tổng kết khi complete, tối thiểu 20 ký tự'),reason:string('Lý do khi release, tối thiểu 10 ký tự')},
  'post /coaching/sessions':{coachId:string('Coach được chọn'),start:string('Khung giờ từ availability',{format:'date-time'}),goal:string('Mục tiêu, ít nhất 10 ký tự')},
  'post /coaching/sessions/{id}/{action}':{start:string('Giờ mới khi reschedule',{format:'date-time'}),summary:string('Tổng kết khi complete')},
  'put /videos/{id}/progress':{position:{type:'integer',minimum:0,description:'Vị trí theo thời lượng bài học mẫu'},completed:{type:'boolean'}},
  'patch /users/me':{displayName:string('Tên hiển thị'),riotId:string('Riot ID'),rank:string('Hạng hiện tại'),timezone:string('Múi giờ',{enum:['Asia/Ho_Chi_Minh','Asia/Bangkok','UTC']})},
  'post /admin/users/{id}/reset-password':{password},
  'post /academy/apply':{goal:string('Mục tiêu ứng tuyển, tối thiểu 20 ký tự')},'post /academy/tasks/{id}':{completed:{type:'boolean'}},
  'patch /admin/plans/{id}':{name:string('Tên gói'),description:string('Mô tả'),amount:{type:'integer',minimum:0},active:{type:'boolean'}},
 };
 for(const [key,properties] of Object.entries(bodies)){const [method,path]=key.split(' '),operation=(doc.paths['/api/v1'+path] as any)?.[method];if(operation)operation.requestBody={required:true,content:{'application/json':{schema:{type:'object',properties}}}}}
 const userFields={
  email,password,displayName:string('Tên hiển thị'),role:string('Vai trò',{enum:['member','coach','admin']}),
  riotId:string('Riot ID'),rank:string('Hạng hiện tại'),timezone:string('Múi giờ',{enum:['Asia/Ho_Chi_Minh','Asia/Bangkok','UTC']}),
  status:string('Trạng thái',{enum:['active','disabled']}),slug:string('Slug coach; bắt buộc khi tạo Coach profile'),
  headline:string('Tiêu đề hồ sơ coach'),bio:string('Giới thiệu coach'),specialty:string('Chuyên môn coach'),
  achievement:string('Thành tích nổi bật'),image:string('Ảnh JPEG, PNG hoặc WebP; tối đa 5 MiB',{format:'binary'}),
 };
 const multipart=(method:string,path:string,properties:Record<string,Field>,required:string[]=[])=>{const operation=(doc.paths[path] as any)?.[method];if(operation)operation.requestBody={required:true,content:{'multipart/form-data':{schema:{type:'object',properties,required}}}}};
 multipart('post','/api/v1/admin/users',userFields,['email','password','displayName','role']);
 multipart('patch','/api/v1/admin/users/{id}',Object.fromEntries(Object.entries(userFields).filter(([name])=>name!=='password')));
 multipart('patch','/api/v1/coach/profile',{displayName:userFields.displayName,headline:userFields.headline,bio:userFields.bio,specialty:userFields.specialty,achievement:userFields.achievement,image:userFields.image});
 const listUsers=(doc.paths['/api/v1/admin/users'] as any)?.get;
 if(listUsers)listUsers.parameters=[
  {name:'search',in:'query',schema:{type:'string'}},{name:'role',in:'query',schema:{type:'string',enum:['member','coach','admin']}},
  {name:'status',in:'query',schema:{type:'string',enum:['active','disabled']}},{name:'page',in:'query',schema:{type:'integer',minimum:1,default:1}},
  {name:'pageSize',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:20}},
 ];
 for(const [path,item] of Object.entries(doc.paths)){for(const method of ['post','patch','put','delete']){const operation=(item as any)?.[method];if(!operation)continue;operation.parameters??=[];if(!path.includes('/webhooks/'))operation.parameters.push({name:'X-SSC-Request',in:'header',required:true,schema:{type:'string',enum:['1']}});operation.parameters.push({name:'Idempotency-Key',in:'header',description:'UUID mới cho mỗi thao tác; dùng lại cùng key khi retry cùng payload.',schema:{type:'string'}});if(path.includes('/webhooks/'))operation.parameters.push({name:'X-Payment-Signature',in:'header',required:true,description:'HMAC-SHA256 của raw JSON body, ký bằng PAYMENT_WEBHOOK_SECRET.',schema:{type:'string'}})}}
 return doc;
}

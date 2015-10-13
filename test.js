var subject = require('./subject.js')
var mock = require('mock-fs');
subject.inc(-1,undefined);
subject.weird(8,-1,41,"werw");
mock({"path/fileExists":{},"pathContent":{"file1":"text content"}});
	subject.fileTest('path/fileExists','pathContent/file1');
mock.restore();
mock({"pathContent":{"file1":"text content"}});
	subject.fileTest('path/fileExists','pathContent/file1');
mock.restore();
mock({"path/fileExists":{},"pathContent":{"file1":""}});
	subject.fileTest('path/fileExists','pathContent/file1');
mock.restore();
mock({"pathContent":{"file1":""}});
	subject.fileTest('path/fileExists','pathContent/file1');
mock.restore();
mock({"path/fileExists":{"file1":"text content"},"pathContent":{"file1":"text content"}});
	subject.fileTest('path/fileExists','pathContent/file1');
mock.restore();
mock({"path/fileExists":{"file1":"text content"},"pathContent":{"file1":""}});
	subject.fileTest('path/fileExists','pathContent/file1');
mock.restore();
mock({"path/fileExists":{"file1":"text content"},"pathContent":{}});
	subject.fileTest('path/fileExists','pathContent/file1');
mock.restore();
subject.normalize('');
subject.format('','',{normalize:true});
subject.blackListNumber("212");
subject.inc(-1,undefined);
subject.inc(1,undefined);
subject.inc(-1,1);
subject.inc(1,1);
subject.weird(8,-1,41,"strict");
subject.weird(6,-1,41,"strict");
subject.weird(8,1,41,"strict");
subject.weird(6,1,41,"strict");
subject.weird(8,-1,43,"strict");
subject.weird(6,-1,43,"strict");
subject.weird(8,1,43,"strict");
subject.weird(6,1,43,"strict");
subject.weird(8,-1,41,"astrict");
subject.weird(6,-1,41,"astrict");
subject.weird(8,1,41,"astrict");
subject.weird(6,1,41,"astrict");
subject.weird(8,-1,43,"astrict");
subject.weird(6,-1,43,"astrict");
subject.weird(8,1,43,"astrict");
subject.weird(6,1,43,"astrict");
subject.weird(8,-1,41,"werw");
subject.weird(6,-1,41,"werw");
subject.weird(8,1,41,"werw");
subject.weird(6,1,41,"werw");
subject.weird(8,-1,43,"werw");
subject.weird(6,-1,43,"werw");
subject.weird(8,1,43,"werw");
subject.weird(6,1,43,"werw");
subject.weird(8,-1,41,"awerw");
subject.weird(6,-1,41,"awerw");
subject.weird(8,1,41,"awerw");
subject.weird(6,1,41,"awerw");
subject.weird(8,-1,43,"awerw");
subject.weird(6,-1,43,"awerw");
subject.weird(8,1,43,"awerw");
subject.weird(6,1,43,"awerw");
subject.fileTest('path/fileExists','path/fileExists');
subject.fileTest('path/fileExists','pathContent/file1');
subject.normalize('');
subject.format('','',{normalize:true});
subject.format('','',{normalize:false});
subject.blackListNumber("212");
subject.blackListNumber("a212");
mui.init({swipeBack: false
,gestureConfig: {tap:true,doubletap:true,longtap:true,hold:true,release:true}});

var 标题栏1 = new 标题栏("标题栏1",null,null,null);
var 按钮1 = new 按钮("按钮1",按钮1_被单击,null,null);
var 按钮2 = new 按钮("按钮2",按钮2_被单击,null,null);
var 对话框1 = new 对话框("对话框1",null,null,null);
var 编辑框1 = new 编辑框("编辑框1",null,null,null,null,null);
//鼠标滚动事件处理，返回滚轮方向 1：向上 -1：向下 
var bluebird_scrollFunc = function(e){ 
    var direct = 0; 
    e = e || window.event; 
    var t1=document.getElementById("wheelDelta"); 
    var t2=document.getElementById("detail"); 
    if(e.wheelDelta){//IE/Opera/Chrome 
        if(Number(e.wheelDelta)>0){
            direct = 1;
        }else{
            direct = -1;
        }
    }else if(e.detail){//Firefox 
        if(Number(e.detail)>0){
            direct = 1;
        }else{
            direct = -1;
        }        
    } 
    主窗口_鼠标滚动(direct); 
} 
//注册鼠标滚动事件
if(document.addEventListener){ 
    document.addEventListener("DOMMouseScroll",bluebird_scrollFunc,false); 
}//W3C 
window.onmousewheel=document.onmousewheel=bluebird_scrollFunc;//IE/Opera/Chrome/Safari 

var 我是变量啊= "你好";

function 按钮1_被单击(){
	对话框1.信息框("信息","计算结果：" + 测试计算(3,4));
}

function 测试计算(参数1,参数2){
	var 结果;
	结果 = 参数1 + 参数2;
	return 结果;
}

function 按钮2_被单击(){
	对话框1.信息框("信息",我是变量啊);
}

function 主窗口_鼠标滚动(滚动方向){
	编辑框1.置内容("滚动方向:" + 滚动方向);
}